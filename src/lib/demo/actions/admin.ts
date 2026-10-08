import { z } from "zod";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { ROLE_LABEL } from "@/lib/permissions";
import { getData, latency, mutate, nextId } from "../store";
import { audit } from "../audit";
import { ROLES, type Role } from "../types";
import { authorize, nowIso } from "./util";

/* ------------------------------------------------------------- comunicados */

const annSchema = z
  .object({
    title: z.string().min(4, "Informe o título.").max(120),
    body: z.string().min(10, "Escreva a mensagem.").max(4000),
    priority: z.enum(["NORMAL", "IMPORTANTE", "URGENTE"]),
    audience: z.enum(["TODOS", "DEPARTAMENTO", "GESTORES"]),
    audienceDepartmentId: z.coerce.number().int().optional().transform((v) => (v ? v : null)),
    publishedAt: z.union([z.literal(""), z.iso.date()]).optional(),
    expiresAt: z.union([z.literal(""), z.iso.date()]).optional(),
  })
  .refine((v) => v.audience !== "DEPARTAMENTO" || v.audienceDepartmentId, { message: "Escolha o departamento.", path: ["audienceDepartmentId"] });

export async function createAnnouncement(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("announcements.manage");
  if (denied) return denied;
  const parsed = annSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const publishedAt = v.publishedAt ? new Date(`${v.publishedAt}T08:00:00-03:00`).toISOString() : nowIso();
  const expiresAt = v.expiresAt ? new Date(`${v.expiresAt}T23:59:00-03:00`).toISOString() : null;
  if (expiresAt && expiresAt <= publishedAt) return fail("A data de expiração deve ser depois da publicação.", { expiresAt: "Data inválida." });
  await latency();
  mutate((d) => {
    const id = nextId(d, "announcements");
    d.announcements.push({ id, title: v.title, body: v.body, priority: v.priority, audience: v.audience, audienceDepartmentId: v.audience === "DEPARTAMENTO" ? v.audienceDepartmentId : null, publishedAt, expiresAt, authorUserId: user.id, baseReads: 0, createdAt: nowIso() });
    d.announcementReads.push({ announcementId: id, userId: user.id, readAt: nowIso() });
    audit(d, user, "PUBLICACAO", `Comunicado publicado: ${v.title}`, { type: "announcement", id });
  });
  return done(publishedAt > nowIso() ? "Comunicado agendado." : "Comunicado publicado para o público escolhido.");
}

export async function deleteAnnouncement(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("announcements.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const a = getData().announcements.find((x) => x.id === id);
  if (!a) return fail("Comunicado não encontrado.");
  await latency();
  mutate((d) => {
    d.announcements = d.announcements.filter((x) => x.id !== id);
    d.announcementReads = d.announcementReads.filter((r) => r.announcementId !== id);
    audit(d, user, "EXCLUSAO", `Comunicado removido: ${a.title}`, { type: "announcement", id });
  });
  return done("Comunicado removido.");
}

/** Abrir a página de comunicados marca os exibidos como lidos. */
export function markAnnouncementsRead(ids: number[], userId: number) {
  mutate((d) => {
    const now = nowIso();
    for (const id of ids) if (!d.announcementReads.some((r) => r.announcementId === id && r.userId === userId)) d.announcementReads.push({ announcementId: id, userId, readAt: now });
  });
}

export function markNotificationsSeen(ids: string[], userId: number) {
  mutate((d) => {
    d.seenNotifications[userId] = [...new Set([...(d.seenNotifications[userId] ?? []), ...ids])];
  });
}

/* ------------------------------------------------------- mensagens do site */

export async function setMessageStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("messages.view");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const status = String(fd.get("status"));
  if (!["RESPONDIDA", "ARQUIVADA", "NOVA"].includes(status)) return fail("Situação inválida.");
  await latency(250, 450);
  mutate((d) => {
    const m = d.contactMessages.find((x) => x.id === id);
    if (m) m.status = status as "NOVA" | "RESPONDIDA" | "ARQUIVADA";
    audit(d, user, "EDICAO", `Mensagem do site #${id} marcada como ${status.toLowerCase()}`, { type: "contact", id });
  });
  return done(status === "ARQUIVADA" ? "Mensagem arquivada." : "Mensagem marcada como respondida.");
}

/* -------------------------------------------------------- usuários e acessos */

/** Senha provisória legível (sem caracteres ambíguos), com letras e números. */
function tempPassword() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(12));
  let s = "";
  for (const x of b) s += abc[x % abc.length];
  return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8, 10) + String(b[0] % 10) + String(b[1] % 10);
}

const createSchema = z.object({
  name: z.string().min(3, "Informe o nome.").max(120),
  email: z.email("E-mail inválido.").transform((v) => v.toLowerCase()),
  role: z.enum(ROLES),
  employeeId: z.coerce.number().int().optional().transform((v) => (v ? v : null)),
});

export async function createUser(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: admin, denied } = authorize("users.manage");
  if (denied) return denied;
  const parsed = createSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const d0 = getData();
  if (d0.users.some((u) => u.email === v.email)) return fail("Já existe um usuário com este e-mail.", { email: "E-mail em uso." });
  if (v.employeeId && d0.users.some((u) => u.employeeId === v.employeeId)) return fail("Este funcionário já tem acesso.", { employeeId: "Já possui usuário." });
  if ((v.role === "GESTOR" || v.role === "FUNCIONARIO") && !v.employeeId) return fail("Gestores e funcionários precisam estar vinculados a um cadastro.", { employeeId: "Vincule ao funcionário." });
  await latency();
  const pw = tempPassword();
  mutate((d) => {
    const id = nextId(d, "users");
    d.users.push({ id, name: v.name, email: v.email, role: v.role, employeeId: v.employeeId, active: true, lastLoginAt: null, passwordChangedAt: null, createdAt: nowIso() });
    audit(d, admin, "PERMISSAO", `Usuário criado: ${v.email} com perfil ${ROLE_LABEL[v.role]}`, { type: "user", id });
  });
  return done(`Acesso criado. Senha provisória: ${pw} (na versão real, enviada por canal seguro).`, { sticky: true });
}

export async function updateUserRole(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: admin, denied } = authorize("users.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const role = String(fd.get("role")) as Role;
  if (!ROLES.includes(role)) return fail("Perfil inválido.");
  const u = getData().users.find((x) => x.id === id);
  if (!u) return fail("Usuário não encontrado.");
  if (u.id === admin.id && role !== "ADMIN") return fail("Você não pode remover o próprio perfil de administrador.");
  if ((role === "GESTOR" || role === "FUNCIONARIO") && !u.employeeId) return fail("Vincule o usuário a um funcionário antes de usar este perfil.");
  if (u.role === role) return done("Sem alterações.");
  await latency();
  mutate((d) => {
    d.users.find((x) => x.id === id)!.role = role;
    audit(d, admin, "PERMISSAO", `Perfil de ${u.email} alterado de ${ROLE_LABEL[u.role]} para ${ROLE_LABEL[role]}`, { type: "user", id });
  });
  return done(`Perfil alterado para ${ROLE_LABEL[role]}.`);
}

export async function toggleUser(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: admin, denied } = authorize("users.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const d0 = getData();
  const u = d0.users.find((x) => x.id === id);
  if (!u) return fail("Usuário não encontrado.");
  if (u.id === admin.id) return fail("Você não pode bloquear o próprio acesso.");
  if (u.role === "ADMIN" && u.active && !d0.users.some((x) => x.role === "ADMIN" && x.active && x.id !== id)) return fail("É preciso manter pelo menos um administrador ativo.");
  await latency();
  mutate((d) => {
    const x = d.users.find((y) => y.id === id)!;
    x.active = !x.active;
    audit(d, admin, "PERMISSAO", `Acesso ${u.active ? "bloqueado" : "reativado"}: ${u.email}`, { type: "user", id });
  });
  return done(u.active ? "Acesso bloqueado." : "Acesso reativado.");
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: admin, denied } = authorize("users.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const u = getData().users.find((x) => x.id === id);
  if (!u) return fail("Usuário não encontrado.");
  await latency();
  const pw = tempPassword();
  mutate((d) => {
    d.users.find((x) => x.id === id)!.passwordChangedAt = null;
    audit(d, admin, "PERMISSAO", `Senha redefinida: ${u.email}`, { type: "user", id });
  });
  return done(`Nova senha provisória de ${u.name.split(" ")[0]}: ${pw}.`, { sticky: true });
}

const pwSchema = z.object({
  current: z.string().min(1, "Informe a senha atual."),
  next: z.string().min(8, "Use pelo menos 8 caracteres, com letras e números."),
  confirm: z.string().min(1, "Repita a nova senha."),
});

export const PASSWORD_RULES = "Mínimo de 8 caracteres, com letras e números.";

export async function changeOwnPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = authorize();
  const parsed = pwSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { current, next, confirm } = parsed.data;
  if (!/[a-zA-Z]/.test(next) || !/\d/.test(next)) return fail(PASSWORD_RULES, { next: PASSWORD_RULES });
  if (next !== confirm) return fail("As senhas não conferem.", { confirm: "Repita exatamente a nova senha." });
  if (current === next) return fail("A nova senha deve ser diferente da atual.", { next: "Escolha outra senha." });
  await latency();
  mutate((d) => {
    d.users.find((x) => x.id === user.id)!.passwordChangedAt = nowIso();
    audit(d, user, "EDICAO", "Senha alterada pelo próprio usuário", { type: "user", id: user.id });
  });
  return done("Senha alterada (simulação: nenhuma senha real é armazenada na demonstração).");
}
