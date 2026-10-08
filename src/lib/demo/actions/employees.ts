import { z } from "zod";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { EMPLOYEE_STATUS_LABEL } from "@/lib/labels";
import { todayISO } from "@/lib/format";
import { getData, latency, mutate, nextId } from "../store";
import { audit } from "../audit";
import { EMPLOYMENT_TYPES, type HistoryType } from "../types";
import { authorize, checkFile, nowIso, photoDataUrl } from "./util";

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

export async function createEmployee(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("employees.manage");
  if (denied) return denied;
  const parsed = employeeSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  if (v.hiredAt > todayISO().slice(0, 4) + "-12-31") return fail("Data de admissão inválida.", { hiredAt: "Data muito no futuro." });
  const d0 = getData();
  const pos = d0.positions.find((p) => p.id === v.positionId);
  if (!pos) return fail("Cargo inválido.", { positionId: "Cargo inválido." });
  if (d0.employees.some((e) => e.corporateEmail === v.corporateEmail)) return fail("Já existe um funcionário com este e-mail.", { corporateEmail: "E-mail já cadastrado." });
  await latency();
  const id = mutate((d) => {
    const id = nextId(d, "employees");
    const now = nowIso();
    d.employees.push({ id, ...v, photo: null, status: "ATIVO", departmentId: pos.departmentId, terminatedAt: null, terminationReason: null, sourceApplicationId: null, createdAt: now, updatedAt: now });
    d.employeeHistory.push({ id: nextId(d, "employeeHistory"), employeeId: id, type: "ADMISSAO", description: `Admissão como ${pos.title}.`, actorUserId: user.id, occurredAt: `${v.hiredAt}T12:00:00.000Z` });
    audit(d, user, "CRIACAO", `Funcionário cadastrado: ${v.name}`, { type: "employee", id });
    return id;
  });
  return done("Funcionário cadastrado.", { redirect: `/rh/funcionarios/${id}` });
}

export async function updateEmployee(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("employees.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const d0 = getData();
  const current = d0.employees.find((e) => e.id === id);
  if (!current) return fail("Funcionário não encontrado.");
  if (current.status === "DESLIGADO") return fail("Funcionário desligado não pode ser editado.");
  const parsed = employeeSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  if (v.managerId === id) return fail("A pessoa não pode ser gestora de si mesma.", { managerId: "Escolha outro gestor." });
  const pos = d0.positions.find((p) => p.id === v.positionId);
  if (!pos) return fail("Cargo inválido.", { positionId: "Cargo inválido." });
  if (d0.employees.some((e) => e.corporateEmail === v.corporateEmail && e.id !== id)) return fail("Outro funcionário já usa este e-mail.", { corporateEmail: "E-mail já cadastrado." });

  const history: { type: HistoryType; description: string }[] = [];
  if (current.positionId !== v.positionId) history.push({ type: "CARGO", description: `Cargo alterado de ${d0.positions.find((p) => p.id === current.positionId)?.title} para ${pos.title}.` });
  if (current.departmentId !== pos.departmentId) {
    const name = (x: number) => d0.departments.find((n) => n.id === x)?.name;
    history.push({ type: "DEPARTAMENTO", description: `Transferência de ${name(current.departmentId)} para ${name(pos.departmentId)}.` });
  }
  if (current.managerId !== v.managerId) {
    const m = v.managerId ? d0.employees.find((e) => e.id === v.managerId)?.name : null;
    history.push({ type: "GESTOR", description: m ? `Novo gestor: ${m}.` : "Gestor removido." });
  }
  const status = v.status ?? current.status;
  if (current.status !== status) history.push({ type: "STATUS", description: `Situação alterada para ${EMPLOYEE_STATUS_LABEL[status]}.` });
  const changedOther = (["name", "corporateEmail", "personalEmail", "phone", "city", "hiredAt", "employmentType", "vacationBalance"] as const).filter((k) => (current[k] ?? null) !== (v[k] ?? null));
  if (changedOther.length) history.push({ type: "CADASTRO", description: "Dados cadastrais atualizados." });

  await latency();
  mutate((d) => {
    const e = d.employees.find((x) => x.id === id)!;
    Object.assign(e, v, { status, departmentId: pos.departmentId, updatedAt: nowIso() });
    for (const h of history) d.employeeHistory.push({ id: nextId(d, "employeeHistory"), employeeId: id, ...h, actorUserId: user.id, occurredAt: nowIso() });
    audit(d, user, "EDICAO", `Cadastro atualizado: ${v.name}${history.length ? ` (${history.map((h) => h.type.toLowerCase()).join(", ")})` : ""}`, { type: "employee", id });
  });
  return done(history.length ? "Alterações salvas e registradas no histórico." : "Alterações salvas.", { redirect: `/rh/funcionarios/${id}` });
}

const deactivateSchema = z.object({
  id: z.coerce.number().int().positive(),
  terminatedAt: z.iso.date("Informe a data do desligamento."),
  reason: z.string().min(3, "Informe o motivo.").max(300),
});

export async function deactivateEmployee(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("employees.manage");
  if (denied) return denied;
  const parsed = deactivateSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, terminatedAt, reason } = parsed.data;
  const emp = getData().employees.find((e) => e.id === id);
  if (!emp) return fail("Funcionário não encontrado.");
  if (emp.status === "DESLIGADO") return fail("Este funcionário já está desligado.");
  if (terminatedAt < emp.hiredAt) return fail("A data de desligamento é anterior à admissão.", { terminatedAt: "Data anterior à admissão." });
  await latency();
  mutate((d) => {
    const e = d.employees.find((x) => x.id === id)!;
    Object.assign(e, { status: "DESLIGADO", terminatedAt, terminationReason: reason, updatedAt: nowIso() });
    d.employeeHistory.push({ id: nextId(d, "employeeHistory"), employeeId: id, type: "DESLIGAMENTO", description: `Desligamento: ${reason}`, actorUserId: user.id, occurredAt: `${terminatedAt}T12:00:00.000Z` });
    // remove o acesso ao sistema
    const u = d.users.find((x) => x.employeeId === id);
    if (u) u.active = false;
    // subordinados ficam sem gestor até nova definição
    for (const s of d.employees.filter((x) => x.managerId === id)) s.managerId = null;
    audit(d, user, "DESATIVACAO", `Funcionário desligado: ${emp.name}`, { type: "employee", id });
  });
  return done(`${emp.name} foi desligado(a). O acesso ao sistema foi removido.`);
}

export async function uploadEmployeePhoto(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("employees.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const emp = getData().employees.find((e) => e.id === id);
  if (!emp) return fail("Funcionário não encontrado.");
  const checked = checkFile(fd.get("photo"), "photo");
  if ("error" in checked) return fail(checked.error, { photo: checked.error });
  let photo: string;
  try {
    photo = await photoDataUrl(checked.file);
  } catch {
    return fail("Não foi possível ler esta imagem.", { photo: "Imagem inválida." });
  }
  await latency();
  mutate((d) => {
    d.employees.find((x) => x.id === id)!.photo = photo;
    audit(d, user, "UPLOAD", `Foto de perfil atualizada: ${emp.name}`, { type: "employee", id });
  });
  return done("Foto atualizada.");
}

export async function removeEmployeePhoto(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("employees.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  await latency(200, 400);
  mutate((d) => {
    const e = d.employees.find((x) => x.id === id);
    if (e) e.photo = null;
    audit(d, user, "EXCLUSAO", `Foto de perfil removida: ${e?.name ?? id}`, { type: "employee", id });
  });
  return done("Foto removida.");
}
