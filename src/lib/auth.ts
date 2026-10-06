import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect, forbidden } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { can, type Permission } from "./permissions";

export const SESSION_COOKIE = "ams_rh_session";
const SESSION_TTL_MS = 10 * 60 * 60 * 1000; // jornada de trabalho: sessão absoluta de 10h
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1h sem atividade encerra a sessão
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  employeeId: number | null;
  departmentId: number | null;
  sessionId: string;
};

export async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
  return { ip, userAgent: h.get("user-agent")?.slice(0, 250) ?? null };
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expires = new Date(now + SESSION_TTL_MS);
  const { ip, userAgent } = await requestMeta();
  db.insert(schema.sessions)
    .values({
      id: sha256(token),
      userId,
      expiresAt: expires.toISOString(),
      lastSeenAt: new Date(now).toISOString(),
      ip,
      userAgent,
    })
    .run();
  // limpeza oportunista de sessões vencidas
  db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date(now).toISOString())).run();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token))).run();
  jar.delete(SESSION_COOKIE);
}

/** Usuário da requisição atual (memoizado por requisição). Não redireciona. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const nowIso = new Date().toISOString();
  const row = db
    .select({
      sessionId: schema.sessions.id,
      lastSeenAt: schema.sessions.lastSeenAt,
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      active: schema.users.active,
      employeeId: schema.users.employeeId,
      departmentId: schema.employees.departmentId,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .leftJoin(schema.employees, eq(schema.employees.id, schema.users.employeeId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, nowIso)))
    .get();
  if (!row || !row.active) return null;
  if (Date.now() - Date.parse(row.lastSeenAt) > IDLE_TIMEOUT_MS) {
    db.delete(schema.sessions).where(eq(schema.sessions.id, row.sessionId)).run();
    return null;
  }
  db.update(schema.sessions).set({ lastSeenAt: nowIso }).where(eq(schema.sessions.id, row.sessionId)).run();
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    employeeId: row.employeeId,
    departmentId: row.departmentId ?? null,
    sessionId: row.sessionId,
  };
});

/** Exige sessão válida (e opcionalmente uma permissão). Use em páginas e Server Actions. */
export async function requireUser(...anyOf: Permission[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/rh/login?expirada=1");
  if (anyOf.length && !anyOf.some((p) => can(user.role, p))) forbidden();
  return user;
}

/** Gestor só enxerga quem está no seu departamento ou se reporta diretamente a ele. */
export function canSeeEmployee(
  user: CurrentUser,
  employee: { id: number; departmentId: number; managerId: number | null },
) {
  if (can(user.role, "employees.view_all")) return true;
  if (user.employeeId === employee.id) return true;
  if (can(user.role, "employees.view_team")) {
    return employee.departmentId === user.departmentId || employee.managerId === user.employeeId;
  }
  return false;
}
