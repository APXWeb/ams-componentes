"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db, schema } from "@/db";
import { ROLES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { hashPassword, passwordIsStrong, PASSWORD_RULES, verifyPassword } from "@/lib/password";
import { ROLE_LABEL } from "@/lib/permissions";

/** Senha provisória legível (sem caracteres ambíguos), com letras e números. */
function tempPassword() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const b = randomBytes(12);
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
  const admin = await requireUser("users.manage");
  const parsed = createSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  if (db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, v.email)).get()) return fail("Já existe um usuário com este e-mail.", { email: "E-mail em uso." });
  if (v.employeeId && db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.employeeId, v.employeeId)).get()) {
    return fail("Este funcionário já tem acesso.", { employeeId: "Já possui usuário." });
  }
  if ((v.role === "GESTOR" || v.role === "FUNCIONARIO") && !v.employeeId) return fail("Gestores e funcionários precisam estar vinculados a um cadastro.", { employeeId: "Vincule ao funcionário." });
  const pw = tempPassword();
  const u = db
    .insert(schema.users)
    .values({ name: v.name, email: v.email, role: v.role, employeeId: v.employeeId, passwordHash: await hashPassword(pw) })
    .returning({ id: schema.users.id })
    .get();
  await audit(admin, "PERMISSAO", `Usuário criado: ${v.email} com perfil ${ROLE_LABEL[v.role]}`, { type: "user", id: u.id });
  revalidatePath("/rh/usuarios");
  return done(`Acesso criado. Senha provisória: ${pw} (anote agora; ela não será exibida de novo).`, true);
}

export async function updateUserRole(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("users.manage");
  const id = Number(fd.get("id"));
  const role = String(fd.get("role")) as (typeof ROLES)[number];
  if (!ROLES.includes(role)) return fail("Perfil inválido.");
  const u = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  if (!u) return fail("Usuário não encontrado.");
  if (u.id === admin.id && role !== "ADMIN") return fail("Você não pode remover o próprio perfil de administrador.");
  if ((role === "GESTOR" || role === "FUNCIONARIO") && !u.employeeId) return fail("Vincule o usuário a um funcionário antes de usar este perfil.");
  if (u.role === role) return done("Sem alterações.");
  db.update(schema.users).set({ role }).where(eq(schema.users.id, id)).run();
  // sessões ativas são encerradas para que o novo perfil valha imediatamente
  db.delete(schema.sessions).where(eq(schema.sessions.userId, id)).run();
  await audit(admin, "PERMISSAO", `Perfil de ${u.email} alterado de ${ROLE_LABEL[u.role]} para ${ROLE_LABEL[role]}`, { type: "user", id });
  revalidatePath("/rh/usuarios");
  return done(`Perfil alterado para ${ROLE_LABEL[role]}.`);
}

export async function toggleUser(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("users.manage");
  const id = Number(fd.get("id"));
  const u = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  if (!u) return fail("Usuário não encontrado.");
  if (u.id === admin.id) return fail("Você não pode bloquear o próprio acesso.");
  if (u.role === "ADMIN" && u.active) {
    const others = db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.role, "ADMIN"), eq(schema.users.active, true), ne(schema.users.id, id))).get();
    if (!others) return fail("É preciso manter pelo menos um administrador ativo.");
  }
  db.update(schema.users).set({ active: !u.active, failedAttempts: 0, lockedUntil: null }).where(eq(schema.users.id, id)).run();
  if (u.active) db.delete(schema.sessions).where(eq(schema.sessions.userId, id)).run();
  await audit(admin, "PERMISSAO", `Acesso ${u.active ? "bloqueado" : "reativado"}: ${u.email}`, { type: "user", id });
  revalidatePath("/rh/usuarios");
  return done(u.active ? "Acesso bloqueado e sessões encerradas." : "Acesso reativado.");
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("users.manage");
  const id = Number(fd.get("id"));
  const u = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  if (!u) return fail("Usuário não encontrado.");
  const pw = tempPassword();
  db.update(schema.users).set({ passwordHash: await hashPassword(pw), failedAttempts: 0, lockedUntil: null, passwordChangedAt: null }).where(eq(schema.users.id, id)).run();
  db.delete(schema.sessions).where(eq(schema.sessions.userId, id)).run();
  await audit(admin, "PERMISSAO", `Senha redefinida: ${u.email}`, { type: "user", id });
  revalidatePath("/rh/usuarios");
  return done(`Nova senha provisória de ${u.name.split(" ")[0]}: ${pw} (anote agora).`, true);
}

const pwSchema = z.object({
  current: z.string().min(1, "Informe a senha atual."),
  next: z.string().min(1, "Informe a nova senha."),
  confirm: z.string().min(1, "Repita a nova senha."),
});

export async function changeOwnPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = pwSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { current, next, confirm } = parsed.data;
  if (!passwordIsStrong(next)) return fail(PASSWORD_RULES, { next: PASSWORD_RULES });
  if (next !== confirm) return fail("As senhas não conferem.", { confirm: "Repita exatamente a nova senha." });
  const u = db.select().from(schema.users).where(eq(schema.users.id, user.id)).get()!;
  if (!(await verifyPassword(current, u.passwordHash))) return fail("Senha atual incorreta.", { current: "Senha incorreta." });
  if (current === next) return fail("A nova senha deve ser diferente da atual.", { next: "Escolha outra senha." });
  db.update(schema.users).set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date().toISOString() }).where(eq(schema.users.id, user.id)).run();
  // mantém apenas a sessão atual
  db.delete(schema.sessions).where(and(eq(schema.sessions.userId, user.id), ne(schema.sessions.id, user.sessionId))).run();
  await audit(user, "EDICAO", "Senha alterada pelo próprio usuário", { type: "user", id: user.id });
  return done("Senha alterada. Outras sessões abertas foram encerradas.");
}
