import { z } from "zod";
import { can } from "@/lib/permissions";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { daysBetween, fmtDate, todayISO } from "@/lib/format";
import { getData, latency, mutate, nextId } from "../store";
import { audit } from "../audit";
import { authorize, nowIso } from "./util";

const schemaReq = z.object({
  employeeId: z.coerce.number().int().positive().optional(),
  startDate: z.iso.date("Informe a data de início."),
  endDate: z.iso.date("Informe a data de término."),
  note: z.string().max(400).optional().transform((v) => v || null),
  approveNow: z.literal("on").optional(),
});

/** Funcionário solicita para si; RH pode registrar para qualquer pessoa (e já aprovar). */
export async function requestVacation(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = authorize();
  const parsed = schemaReq.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const hr = can(user.role, "vacations.manage");
  const employeeId = hr && v.employeeId ? v.employeeId : user.employeeId;
  if (!employeeId) return fail(hr ? "Escolha o funcionário." : "Seu usuário não está vinculado a um cadastro de funcionário.", hr ? { employeeId: "Escolha o funcionário." } : undefined);

  const d0 = getData();
  const emp = d0.employees.find((e) => e.id === employeeId);
  if (!emp || emp.status === "DESLIGADO") return fail("Funcionário inválido.");
  if (v.endDate < v.startDate) return fail("O término deve ser depois do início.", { endDate: "Término antes do início." });
  if (!hr && v.startDate <= todayISO()) return fail("Solicite com antecedência: a data de início deve ser futura.", { startDate: "Escolha uma data futura." });
  const days = daysBetween(v.startDate, v.endDate) + 1;
  if (days < 5) return fail("Cada período de férias deve ter pelo menos 5 dias.", { endDate: "Mínimo de 5 dias." });
  if (days > 30) return fail("O período máximo é de 30 dias.", { endDate: "Máximo de 30 dias." });
  const committed = d0.vacations.filter((x) => x.employeeId === employeeId && x.status === "PENDENTE").reduce((a, b) => a + b.days, 0);
  if (days + committed > emp.vacationBalance) {
    return fail(`Saldo insuficiente: ${emp.vacationBalance} dias disponíveis${committed ? `, ${committed} já em pedidos pendentes` : ""}.`, { endDate: "Período maior que o saldo." });
  }
  const overlap = d0.vacations.find((x) => x.employeeId === employeeId && (x.status === "PENDENTE" || x.status === "APROVADO") && x.startDate <= v.endDate && x.endDate >= v.startDate);
  if (overlap) return fail(`Já existe férias de ${fmtDate(overlap.startDate)} a ${fmtDate(overlap.endDate)} nesse período.`, { startDate: "Período em conflito." });

  const approve = hr && v.approveNow === "on";
  await latency();
  mutate((d) => {
    const id = nextId(d, "vacations");
    const now = nowIso();
    d.vacations.push({ id, employeeId, startDate: v.startDate, endDate: v.endDate, days, note: v.note, status: approve ? "APROVADO" : "PENDENTE", reviewNote: null, requestedById: user.id, reviewedById: approve ? user.id : null, reviewedAt: approve ? now : null, createdAt: now });
    if (approve) d.employees.find((e) => e.id === employeeId)!.vacationBalance -= days;
    audit(d, user, approve ? "APROVACAO" : "CRIACAO", `Férias ${approve ? "registradas e aprovadas" : "solicitadas"}: ${emp.name}, ${fmtDate(v.startDate)} a ${fmtDate(v.endDate)}`, { type: "vacation", id });
  });
  return done(approve ? "Férias registradas e aprovadas." : hr ? "Pedido de férias registrado." : "Pedido enviado ao RH. Acompanhe a resposta nesta página.");
}

const reviewSchema = z.object({
  id: z.coerce.number().int().positive(),
  decision: z.enum(["APROVADO", "RECUSADO"]),
  note: z.string().max(400).optional(),
});

export async function reviewVacation(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("vacations.manage");
  if (denied) return denied;
  const parsed = reviewSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, decision, note } = parsed.data;
  if (decision === "RECUSADO" && !note) return fail("Explique o motivo da recusa.", { note: "Informe o motivo." });
  const d0 = getData();
  const vac = d0.vacations.find((x) => x.id === id && x.status === "PENDENTE");
  if (!vac) return fail("Este pedido já foi respondido.");
  const emp = d0.employees.find((e) => e.id === vac.employeeId)!;
  if (decision === "APROVADO") {
    if (vac.days > emp.vacationBalance) return fail(`Saldo insuficiente (${emp.vacationBalance} dias).`);
    if (d0.vacations.some((x) => x.employeeId === vac.employeeId && x.status === "APROVADO" && x.id !== id && x.startDate <= vac.endDate && x.endDate >= vac.startDate)) return fail("Há outras férias aprovadas no mesmo período.");
  }
  await latency();
  mutate((d) => {
    const x = d.vacations.find((y) => y.id === id)!;
    Object.assign(x, { status: decision, reviewNote: note || null, reviewedById: user.id, reviewedAt: nowIso() });
    if (decision === "APROVADO") d.employees.find((e) => e.id === emp.id)!.vacationBalance -= vac.days;
    audit(d, user, decision === "APROVADO" ? "APROVACAO" : "RECUSA", `Férias ${decision === "APROVADO" ? "aprovadas" : "recusadas"}: ${emp.name}, ${fmtDate(vac.startDate)} a ${fmtDate(vac.endDate)}`, { type: "vacation", id });
  });
  return done(decision === "APROVADO" ? `Férias de ${emp.name.split(" ")[0]} aprovadas. O saldo foi atualizado.` : "Pedido recusado. O funcionário verá o motivo.");
}

export async function cancelVacation(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = authorize();
  const id = Number(fd.get("id"));
  const vac = getData().vacations.find((x) => x.id === id);
  if (!vac) return fail("Pedido não encontrado.");
  const hr = can(user.role, "vacations.manage");
  const own = vac.employeeId === user.employeeId;
  if (!hr && !(own && vac.status === "PENDENTE")) return fail("Você só pode cancelar seus pedidos ainda pendentes.");
  if (!["PENDENTE", "APROVADO"].includes(vac.status)) return fail("Este pedido não pode ser cancelado.");
  if (vac.status === "APROVADO" && vac.startDate <= todayISO()) return fail("Férias já iniciadas não podem ser canceladas.");
  await latency();
  mutate((d) => {
    const x = d.vacations.find((y) => y.id === id)!;
    if (x.status === "APROVADO") d.employees.find((e) => e.id === x.employeeId)!.vacationBalance += x.days;
    Object.assign(x, { status: "CANCELADO", reviewedById: user.id, reviewedAt: nowIso() });
    audit(d, user, "EDICAO", `Férias canceladas (${fmtDate(x.startDate)} a ${fmtDate(x.endDate)})`, { type: "vacation", id });
  });
  return done("Pedido cancelado.");
}
