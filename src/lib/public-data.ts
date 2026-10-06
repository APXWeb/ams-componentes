import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Somente vagas publicadas e seus campos públicos chegam ao site. */
export function getOpenVacancies() {
  return db
    .select({
      id: schema.vacancies.id,
      slug: schema.vacancies.slug,
      title: schema.vacancies.title,
      summary: schema.vacancies.summary,
      location: schema.vacancies.location,
      employmentType: schema.vacancies.employmentType,
      publishedAt: schema.vacancies.publishedAt,
      department: schema.departments.name,
      isDemo: schema.vacancies.isDemo,
    })
    .from(schema.vacancies)
    .innerJoin(schema.departments, eq(schema.departments.id, schema.vacancies.departmentId))
    .where(eq(schema.vacancies.status, "ABERTA"))
    .orderBy(desc(schema.vacancies.publishedAt))
    .all();
}

export function getOpenVacancy(slug: string) {
  return db
    .select({
      id: schema.vacancies.id,
      slug: schema.vacancies.slug,
      title: schema.vacancies.title,
      summary: schema.vacancies.summary,
      description: schema.vacancies.description,
      requirements: schema.vacancies.requirements,
      additionalInfo: schema.vacancies.additionalInfo,
      location: schema.vacancies.location,
      employmentType: schema.vacancies.employmentType,
      openings: schema.vacancies.openings,
      publishedAt: schema.vacancies.publishedAt,
      department: schema.departments.name,
      isDemo: schema.vacancies.isDemo,
    })
    .from(schema.vacancies)
    .innerJoin(schema.departments, eq(schema.departments.id, schema.vacancies.departmentId))
    .where(and(eq(schema.vacancies.slug, slug), eq(schema.vacancies.status, "ABERTA")))
    .get();
}

export function getDepartmentsPublic() {
  return db.select({ name: schema.departments.name, description: schema.departments.description }).from(schema.departments).orderBy(asc(schema.departments.id)).all();
}

/** Os dados de RH são de demonstração enquanto houver registros marcados como demo. */
export function isDemoEnvironment() {
  return !!db.select({ id: schema.employees.id }).from(schema.employees).where(eq(schema.employees.isDemo, true)).limit(1).get();
}
