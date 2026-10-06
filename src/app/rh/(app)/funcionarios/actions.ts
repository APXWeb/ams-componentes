"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { EMPLOYMENT_TYPES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { saveUpload, UploadError } from "@/lib/storage";
import { EMPLOYEE_STATUS_LABEL } from "@/lib/labels";
import { todayISO } from "@/lib/format";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const employeeSchema = z.object({
  name: z.string().min(3, "Informe o nome completo.").max(120),
  positionId: z.coerce.number({ message: "Escolha o cargo." }).int().positive("Escolha o cargo."),
  managerId: z.coerce.number().int().optional().transform((v) => (v ? v : null)),
  corporateEmail: z.email("E-mail corporativo inválido.").max(160).transform((v) => v.toLowerCase()),
  personalEmail: z.union([z.literal(""), z.email("E-mail pessoal inválido.")]).optional().transform((v) => (v ? v.toLowerCase() : null)),
  phone: optionalText(30),
  city: optionalText(80),
  hiredAt: z.iso.date("Informe a data de admissão."),
  employmentType: z.enum(EMPLOYMENT_TYPES, { message: "Escolha o tipo de contratação." }),
  status: z.enum(["ATIVO", "AFASTADO"]).optional(),
  vacationBalance: z.coerce.number().int().min(0, "Saldo inválido.").max(60, "Saldo máximo de 60 dias."),
});

function positionDept(positionId: number) {
  return db.select({ departmentId: schema.positions.departmentId, title: schema.positions.title }).from(schema.positions).where(eq(schema.positions.id, positionId)).get();
}

export async function createEmployee(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("employees.manage");
  const parsed = employeeSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  if (v.hiredAt > todayISO().slice(0, 4) + "-12-31") return fail("Data de admissão inválida.", { hiredAt: "Data muito no futuro." });
  const pos = positionDept(v.positionId);
  if (!pos) return fail("Cargo inválido.", { positionId: "Cargo inválido." });
  if (db.select({ id: schema.employees.id }).from(schema.employees).where(eq(schema.employees.corporateEmail, v.corporateEmail)).get()) {
    return fail("Já existe um funcionário com este e-mail.", { corporateEmail: "E-mail já cadastrado." });
  }
  const id = db.transaction((tx) => {
    const e = tx
      .insert(schema.employees)
      .values({ ...v, status: "ATIVO", departmentId: pos.departmentId })
      .returning({ id: schema.employees.id })
      .get();
    tx.insert(schema.employeeHistory).values({ employeeId: e.id, type: "ADMISSAO", description: `Admissão como ${pos.title}.`, actorUserId: user.id, occurredAt: `${v.hiredAt}T12:00:00.000Z` }).run();
    return e.id;
  });
  await audit(user, "CRIACAO", `Funcionário cadastrado: ${v.name}`, { type: "employee", id });
  revalidatePath("/rh/funcionarios");
  redirect(`/rh/funcionarios/${id}?criado=1`);
}

export async function updateEmployee(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("employees.manage");
  const id = Number(fd.get("id"));
  const current = db.select().from(schema.employees).where(eq(schema.employees.id, id)).get();
  if (!current) return fail("Funcionário não encontrado.");
  if (current.status === "DESLIGADO") return fail("Funcionário desligado não pode ser editado.");
  const parsed = employeeSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  if (v.managerId === id) return fail("A pessoa não pode ser gestora de si mesma.", { managerId: "Escolha outro gestor." });
  const pos = positionDept(v.positionId);
  if (!pos) return fail("Cargo inválido.", { positionId: "Cargo inválido." });
  if (db.select({ id: schema.employees.id }).from(schema.employees).where(and(eq(schema.employees.corporateEmail, v.corporateEmail), ne(schema.employees.id, id))).get()) {
    return fail("Outro funcionário já usa este e-mail.", { corporateEmail: "E-mail já cadastrado." });
  }

  const history: { type: (typeof schema.employeeHistory.$inferInsert)["type"]; description: string }[] = [];
  if (current.positionId !== v.positionId) {
    const old = positionDept(current.positionId);
    history.push({ type: "CARGO", description: `Cargo alterado de ${old?.title} para ${pos.title}.` });
  }
  if (current.departmentId !== pos.departmentId) {
    const names = db.select({ id: schema.departments.id, name: schema.departments.name }).from(schema.departments).all();
    history.push({ type: "DEPARTAMENTO", description: `Transferência de ${names.find((n) => n.id === current.departmentId)?.name} para ${names.find((n) => n.id === pos.departmentId)?.name}.` });
  }
  if (current.managerId !== v.managerId) {
    const m = v.managerId ? db.select({ name: schema.employees.name }).from(schema.employees).where(eq(schema.employees.id, v.managerId)).get()?.name : null;
    history.push({ type: "GESTOR", description: m ? `Novo gestor: ${m}.` : "Gestor removido." });
  }
  const status = v.status ?? current.status;
  if (current.status !== status) history.push({ type: "STATUS", description: `Situação alterada para ${EMPLOYEE_STATUS_LABEL[status]}.` });
  const changedOther = (["name", "corporateEmail", "personalEmail", "phone", "city", "hiredAt", "employmentType", "vacationBalance"] as const).filter(
    (k) => (current[k] ?? null) !== (v[k] ?? null),
  );
  if (changedOther.length) history.push({ type: "CADASTRO", description: "Dados cadastrais atualizados." });

  db.transaction((tx) => {
    tx.update(schema.employees)
      .set({ ...v, status, departmentId: pos.departmentId, updatedAt: new Date().toISOString() })
      .where(eq(schema.employees.id, id))
      .run();
    for (const h of history) tx.insert(schema.employeeHistory).values({ employeeId: id, ...h, actorUserId: user.id, occurredAt: new Date().toISOString() }).run();
  });
  await audit(user, "EDICAO", `Cadastro atualizado: ${v.name}${history.length ? ` (${history.map((h) => h.type.toLowerCase()).join(", ")})` : ""}`, { type: "employee", id });
  revalidatePath(`/rh/funcionarios/${id}`);
  redirect(`/rh/funcionarios/${id}?salvo=1`);
}

const deactivateSchema = z.object({
  id: z.coerce.number().int().positive(),
  terminatedAt: z.iso.date("Informe a data do desligamento."),
  reason: z.string().min(3, "Informe o motivo.").max(300),
});

export async function deactivateEmployee(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("employees.manage");
  const parsed = deactivateSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, terminatedAt, reason } = parsed.data;
  const emp = db.select().from(schema.employees).where(eq(schema.employees.id, id)).get();
  if (!emp) return fail("Funcionário não encontrado.");
  if (emp.status === "DESLIGADO") return fail("Este funcionário já está desligado.");
  if (terminatedAt < emp.hiredAt) return fail("A data de desligamento é anterior à admissão.", { terminatedAt: "Data anterior à admissão." });
  db.transaction((tx) => {
    tx.update(schema.employees).set({ status: "DESLIGADO", terminatedAt, terminationReason: reason, updatedAt: new Date().toISOString() }).where(eq(schema.employees.id, id)).run();
    tx.insert(schema.employeeHistory).values({ employeeId: id, type: "DESLIGAMENTO", description: `Desligamento: ${reason}`, actorUserId: user.id, occurredAt: `${terminatedAt}T12:00:00.000Z` }).run();
    // remove o acesso ao sistema e encerra sessões ativas
    const u = tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.employeeId, id)).get();
    if (u) {
      tx.update(schema.users).set({ active: false }).where(eq(schema.users.id, u.id)).run();
      tx.delete(schema.sessions).where(eq(schema.sessions.userId, u.id)).run();
    }
    // subordinados ficam sem gestor até nova definição
    tx.update(schema.employees).set({ managerId: null }).where(eq(schema.employees.managerId, id)).run();
  });
  await audit(user, "DESATIVACAO", `Funcionário desligado: ${emp.name}`, { type: "employee", id });
  revalidatePath(`/rh/funcionarios/${id}`);
  return done(`${emp.name} foi desligado(a). O acesso ao sistema foi removido.`);
}

export async function uploadEmployeePhoto(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("employees.manage");
  const id = Number(fd.get("id"));
  const emp = db.select({ id: schema.employees.id, name: schema.employees.name }).from(schema.employees).where(eq(schema.employees.id, id)).get();
  if (!emp) return fail("Funcionário não encontrado.");
  try {
    const file = fd.get("photo");
    if (!(file instanceof File)) return fail("Selecione uma foto.", { photo: "Selecione uma foto." });
    const stored = await saveUpload(file, "photo");
    const doc = db
      .insert(schema.documents)
      .values({ employeeId: id, category: "OUTROS", title: "Foto de perfil", status: "VALIDADO", uploadedById: user.id, uploadedAt: new Date().toISOString(), ...stored })
      .returning({ id: schema.documents.id })
      .get();
    db.update(schema.employees).set({ photoDocumentId: doc.id }).where(eq(schema.employees.id, id)).run();
    await audit(user, "UPLOAD", `Foto de perfil atualizada: ${emp.name}`, { type: "employee", id });
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message, { photo: e.message });
    throw e;
  }
  revalidatePath(`/rh/funcionarios/${id}`);
  return done("Foto atualizada.");
}
