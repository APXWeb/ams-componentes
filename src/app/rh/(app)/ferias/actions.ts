"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { daysBetween, fmtDate, todayISO } from "@/lib/format";

const schemaReq = z.object({
  employeeId: z.coerce.number().int().positive().optional(),
  startDate: z.iso.date("Informe a data de início."),
  endDate: z.iso.date("Informe a data de término."),
  note: z.string().max(400).optional().transform((v) => v || null),
  approveNow: z.literal("on").optional(),
});

function revalidate(employeeId: number) {
  revalidatePath("/rh/ferias");
  revalidatePath("/rh");
  revalidatePath(`/rh/funcionarios/${employeeId}`);
}

/** Funcionário solicita para si; RH pode registrar para qualquer pessoa (e já aprovar). */
export async function requestVacation(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schemaReq.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const hr = can(user.role, "vacations.manage");
  const employeeId = hr && v.employeeId ? v.employeeId : user.employeeId;
  if (!employeeId) return fail("Seu usuário não está vinculado a um cadastro de funcionário.");

  const emp = db.select().from(schema.employees).where(eq(schema.employees.id, employeeId)).get();
  if (!emp || emp.status === "DESLIGADO") return fail("Funcionário inválido.");
  if (v.endDate < v.startDate) return fail("O término deve ser depois do início.", { endDate: "Término antes do início." });
  if (!hr && v.startDate <= todayISO()) return fail("Solicite com antecedência: a data de início deve ser futura.", { startDate: "Escolha uma data futura." });
  const days = daysBetween(v.startDate, v.endDate) + 1;
  if (days < 5) return fail("Cada período de férias deve ter pelo menos 5 dias.", { endDate: "Mínimo de 5 dias." });
  if (days > 30) return fail("O período máximo é de 30 dias.", { endDate: "Máximo de 30 dias." });

  const committed = db
    .select({ days: schema.vacations.days })
    .from(schema.vacations)
    .where(and(eq(schema.vacations.employeeId, employeeId), eq(schema.vacations.status, "PENDENTE")))
    .all()
    .reduce((a, b) => a + b.days, 0);
  if (days + committed > emp.vacationBalance) {
    return fail(`Saldo insuficiente: ${emp.vacationBalance} dias disponíveis${committed ? `, ${committed} já em pedidos pendentes` : ""}.`, { endDate: "Período maior que o saldo." });
  }
  const overlap = db
    .select({ id: schema.vacations.id, s: schema.vacations.startDate, e: schema.vacations.endDate })
    .from(schema.vacations)
    .where(and(eq(schema.vacations.employeeId, employeeId), inArray(schema.vacations.status, ["PENDENTE", "APROVADO"]), lte(schema.vacations.startDate, v.endDate), gte(schema.vacations.endDate, v.startDate)))
    .get();
  if (overlap) return fail(`Já existe férias de ${fmtDate(overlap.s)} a ${fmtDate(overlap.e)} nesse período.`, { startDate: "Período em conflito." });

  const approve = hr && v.approveNow === "on";
  const id = db.transaction((tx) => {
    const r = tx
      .insert(schema.vacations)
      .values({
        employeeId,
        startDate: v.startDate,
        endDate: v.endDate,
        days,
        note: v.note,
        status: approve ? "APROVADO" : "PENDENTE",
        requestedById: user.id,
        reviewedById: approve ? user.id : null,
        reviewedAt: approve ? new Date().toISOString() : null,
      })
      .returning({ id: schema.vacations.id })
      .get();
    if (approve) tx.update(schema.employees).set({ vacationBalance: emp.vacationBalance - days }).where(eq(schema.employees.id, employeeId)).run();
    return r.id;
  });
  await audit(user, approve ? "APROVACAO" : "CRIACAO", `Férias ${approve ? "registradas e aprovadas" : "solicitadas"}: ${emp.name}, ${fmtDate(v.startDate)} a ${fmtDate(v.endDate)}`, { type: "vacation", id });
  revalidate(employeeId);
  return done(approve ? "Férias registradas e aprovadas." : hr ? "Pedido de férias registrado." : "Pedido enviado ao RH. Acompanhe a resposta nesta página.");
}

const reviewSchema = z.object({
  id: z.coerce.number().int().positive(),
  decision: z.enum(["APROVADO", "RECUSADO"]),
  note: z.string().max(400).optional(),
});

export async function reviewVacation(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("vacations.manage");
  const parsed = reviewSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, decision, note } = parsed.data;
  if (decision === "RECUSADO" && !note) return fail("Explique o motivo da recusa.", { note: "Informe o motivo." });
  const vac = db.select().from(schema.vacations).where(and(eq(schema.vacations.id, id), eq(schema.vacations.status, "PENDENTE"))).get();
  if (!vac) return fail("Este pedido já foi respondido.");
  const emp = db.select().from(schema.employees).where(eq(schema.employees.id, vac.employeeId)).get()!;
  if (decision === "APROVADO") {
    if (vac.days > emp.vacationBalance) return fail(`Saldo insuficiente (${emp.vacationBalance} dias).`);
    const clash = db
      .select({ id: schema.vacations.id })
      .from(schema.vacations)
      .where(and(eq(schema.vacations.employeeId, vac.employeeId), eq(schema.vacations.status, "APROVADO"), ne(schema.vacations.id, id), lte(schema.vacations.startDate, vac.endDate), gte(schema.vacations.endDate, vac.startDate)))
      .get();
    if (clash) return fail("Há outras férias aprovadas no mesmo período.");
  }
  db.transaction((tx) => {
    tx.update(schema.vacations).set({ status: decision, reviewNote: note || null, reviewedById: user.id, reviewedAt: new Date().toISOString() }).where(eq(schema.vacations.id, id)).run();
    if (decision === "APROVADO") tx.update(schema.employees).set({ vacationBalance: emp.vacationBalance - vac.days }).where(eq(schema.employees.id, emp.id)).run();
  });
  await audit(user, decision === "APROVADO" ? "APROVACAO" : "RECUSA", `Férias ${decision === "APROVADO" ? "aprovadas" : "recusadas"}: ${emp.name}, ${fmtDate(vac.startDate)} a ${fmtDate(vac.endDate)}`, { type: "vacation", id });
  revalidate(emp.id);
  return done(decision === "APROVADO" ? `Férias de ${emp.name.split(" ")[0]} aprovadas.` : "Pedido recusado.");
}

export async function cancelVacation(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const vac = db.select().from(schema.vacations).where(eq(schema.vacations.id, id)).get();
  if (!vac) return fail("Pedido não encontrado.");
  const hr = can(user.role, "vacations.manage");
  const own = vac.employeeId === user.employeeId;
  if (!hr && !(own && vac.status === "PENDENTE")) return fail("Você só pode cancelar seus pedidos ainda pendentes.");
  if (!["PENDENTE", "APROVADO"].includes(vac.status)) return fail("Este pedido não pode ser cancelado.");
  if (vac.status === "APROVADO" && vac.startDate <= todayISO()) return fail("Férias já iniciadas não podem ser canceladas.");
  db.transaction((tx) => {
    tx.update(schema.vacations).set({ status: "CANCELADO", reviewedById: user.id, reviewedAt: new Date().toISOString() }).where(eq(schema.vacations.id, id)).run();
    if (vac.status === "APROVADO") {
      const emp = tx.select({ b: schema.employees.vacationBalance }).from(schema.employees).where(eq(schema.employees.id, vac.employeeId)).get()!;
      tx.update(schema.employees).set({ vacationBalance: emp.b + vac.days }).where(eq(schema.employees.id, vac.employeeId)).run();
    }
  });
  await audit(user, "EDICAO", `Férias canceladas (${fmtDate(vac.startDate)} a ${fmtDate(vac.endDate)})`, { type: "vacation", id });
  revalidate(vac.employeeId);
  return done("Pedido cancelado.");
}
