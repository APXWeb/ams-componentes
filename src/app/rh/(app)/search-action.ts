"use server";

import { and, desc, eq, like, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { employeesScope, vacanciesScope } from "@/lib/rh-scope";

export type SearchHit = { group: string; label: string; href: string; meta?: string; kind: "page" | "employee" | "candidate" | "vacancy" };

/** Busca global respeitando o escopo de cada perfil (gestor só vê a equipe; funcionário só páginas). */
export async function globalSearch(q: string): Promise<SearchHit[]> {
  const user = await requireUser();
  const term = String(q ?? "").trim().slice(0, 60);
  if (term.length < 2) return [];
  const pat = `%${term.replace(/[%_]/g, "")}%`;
  const hits: SearchHit[] = [];

  if (can(user.role, "employees.view_all") || can(user.role, "employees.view_team")) {
    const emps = db
      .select({ id: schema.employees.id, name: schema.employees.name, email: schema.employees.corporateEmail })
      .from(schema.employees)
      .where(and(or(like(schema.employees.name, pat), like(schema.employees.corporateEmail, pat)), employeesScope(user)))
      .limit(6)
      .all();
    hits.push(...emps.map((e) => ({ group: "Funcionários", label: e.name, href: `/rh/funcionarios/${e.id}`, meta: e.email, kind: "employee" as const })));
  }

  if (can(user.role, "recruitment.view")) {
    const vac = db
      .select({ id: schema.vacancies.id, title: schema.vacancies.title })
      .from(schema.vacancies)
      .where(and(like(schema.vacancies.title, pat), vacanciesScope(user)))
      .limit(5)
      .all();
    hits.push(...vac.map((v) => ({ group: "Vagas", label: v.title, href: `/rh/recrutamento?vaga=${v.id}`, kind: "vacancy" as const })));

    const apps = db
      .select({ id: schema.applications.id, name: schema.candidates.name, vacancy: schema.vacancies.title })
      .from(schema.applications)
      .innerJoin(schema.candidates, eq(schema.candidates.id, schema.applications.candidateId))
      .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
      .where(and(or(like(schema.candidates.name, pat), like(schema.candidates.email, pat)), vacanciesScope(user)))
      .orderBy(desc(schema.applications.createdAt))
      .limit(6)
      .all();
    hits.push(...apps.map((a) => ({ group: "Candidatos", label: a.name, href: `/rh/candidatos/${a.id}`, meta: a.vacancy, kind: "candidate" as const })));
  }
  return hits;
}
