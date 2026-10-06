"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, destroySession, getCurrentUser, LOCK_MINUTES, MAX_FAILED_ATTEMPTS, requestMeta } from "@/lib/auth";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { hit, isLimited } from "@/lib/rate-limit";
import { fail, formObject, type ActionState } from "@/lib/action";

const loginSchema = z.object({
  email: z.email("Informe seu e-mail corporativo.").max(160),
  password: z.string().min(1, "Informe a senha.").max(200),
  next: z.string().optional(),
});

const GENERIC = "E-mail ou senha incorretos.";

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(fd));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return fail("Preencha e-mail e senha.", fe);
  }
  const email = parsed.data.email.toLowerCase();
  const { ip } = await requestMeta();
  // só tentativas que falham contam para o limite (por IP e por e-mail)
  const WINDOW = 15 * 60_000;
  if (isLimited(`login:ip:${ip}`, 30, WINDOW) || isLimited(`login:email:${email}`, 10, WINDOW)) {
    return fail("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  }
  const failed = () => {
    hit(`login:ip:${ip}`);
    hit(`login:email:${email}`);
  };

  const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  // compara mesmo quando o usuário não existe, para não revelar e-mails cadastrados pelo tempo de resposta
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.active) {
    failed();
    await audit({ id: null, name: email }, "LOGIN_FALHOU", "Tentativa de login com usuário inexistente ou inativo");
    return fail(GENERIC);
  }
  if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) {
    return fail(`Acesso bloqueado temporariamente por excesso de tentativas. Tente novamente em até ${LOCK_MINUTES} minutos ou fale com o administrador.`);
  }
  if (!ok) {
    failed();
    const attempts = user.failedAttempts + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    db.update(schema.users)
      .set({ failedAttempts: lock ? 0 : attempts, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null })
      .where(eq(schema.users.id, user.id))
      .run();
    await audit({ id: user.id, name: user.name }, "LOGIN_FALHOU", lock ? "Senha incorreta: acesso bloqueado por 15 minutos" : "Senha incorreta", { type: "user", id: user.id });
    return fail(lock ? `Acesso bloqueado por ${LOCK_MINUTES} minutos após ${MAX_FAILED_ATTEMPTS} tentativas.` : GENERIC);
  }

  db.update(schema.users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date().toISOString() })
    .where(eq(schema.users.id, user.id))
    .run();
  await createSession(user.id);
  await audit({ id: user.id, name: user.name }, "LOGIN", "Login realizado", { type: "user", id: user.id });

  const next = parsed.data.next;
  redirect(next && next.startsWith("/rh") && !next.startsWith("//") ? next : "/rh");
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) await audit(user, "LOGOUT", "Logout realizado", { type: "user", id: user.id });
  await destroySession();
  redirect("/rh/login?saiu=1");
}
