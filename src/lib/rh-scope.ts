import "server-only";
import { and, eq, gt, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { schema } from "@/db";
import type { CurrentUser } from "./auth";
import { can } from "./permissions";

/*
 * Filtros de escopo aplicados nas consultas (autorização no nível dos dados):
 * o que cada perfil pode enxergar é decidido aqui, nunca no frontend.
 */

/** Funcionários visíveis: RH/Admin todos; gestor a própria equipe; funcionário só a si mesmo. */
export function employeesScope(user: CurrentUser): SQL | undefined {
  if (can(user.role, "employees.view_all")) return undefined;
  if (can(user.role, "employees.view_team")) {
    return or(
      user.departmentId ? eq(schema.employees.departmentId, user.departmentId) : sql`0`,
      user.employeeId ? eq(schema.employees.managerId, user.employeeId) : sql`0`,
      user.employeeId ? eq(schema.employees.id, user.employeeId) : sql`0`,
    );
  }
  return user.employeeId ? eq(schema.employees.id, user.employeeId) : sql`0`;
}

/** Vagas visíveis no recrutamento: RH/Admin todas; gestor apenas as do seu departamento. */
export function vacanciesScope(user: CurrentUser): SQL | undefined {
  if (can(user.role, "recruitment.manage")) return undefined;
  if (can(user.role, "recruitment.view") && user.departmentId) return eq(schema.vacancies.departmentId, user.departmentId);
  return sql`0`;
}

/** Comunicados publicados e dirigidos ao usuário. */
export function visibleAnnouncementsWhere(user: CurrentUser): SQL {
  const now = new Date().toISOString();
  const live = and(lte(schema.announcements.publishedAt, now), or(isNull(schema.announcements.expiresAt), gt(schema.announcements.expiresAt, now)))!;
  if (can(user.role, "announcements.manage")) return live;
  const audience = or(
    eq(schema.announcements.audience, "TODOS"),
    user.departmentId ? and(eq(schema.announcements.audience, "DEPARTAMENTO"), eq(schema.announcements.audienceDepartmentId, user.departmentId)) : sql`0`,
    user.role === "GESTOR" ? eq(schema.announcements.audience, "GESTORES") : sql`0`,
  )!;
  return and(live, audience)!;
}

