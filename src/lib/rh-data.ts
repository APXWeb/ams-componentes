import "server-only";
import { alias } from "drizzle-orm/sqlite-core";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CurrentUser } from "./auth";
import { STAGES } from "@/db/schema";
import { addDays, todayISO, MONTHS_SHORT } from "./format";
import { STAGE_LABEL } from "./labels";
import { employeesScope, vacanciesScope } from "./rh-scope";
import type { CalEvent } from "@/components/rh/calendar";

const nowIso = () => new Date().toISOString();

export function activeEmployeesCount(scope?: SQL) {
  return db.select({ n: count() }).from(schema.employees).where(and(ne(schema.employees.status, "DESLIGADO"), scope)).get()!.n;
}

export function hiresSince(days: number, scope?: SQL) {
  return db
    .select({ n: count() })
    .from(schema.employees)
    .where(and(gte(schema.employees.hiredAt, addDays(todayISO(), -days)), scope))
    .get()!.n;
}

export function openVacanciesCount(scope?: SQL) {
  return db.select({ n: count() }).from(schema.vacancies).where(and(eq(schema.vacancies.status, "ABERTA"), scope)).get()!.n;
}

export function activeApplicationsCount(scope?: SQL) {
  return db
    .select({ n: count() })
    .from(schema.applications)
    .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
    .where(and(eq(schema.applications.outcome, "EM_ANDAMENTO"), scope))
    .get()!.n;
}

export function pipelineCounts(user: CurrentUser) {
  const rows = db
    .select({ stage: schema.applications.stage, n: count() })
    .from(schema.applications)
    .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
    .where(and(or(eq(schema.applications.outcome, "EM_ANDAMENTO"), eq(schema.applications.outcome, "CONTRATADO")), vacanciesScope(user)))
    .groupBy(schema.applications.stage)
    .all();
  return STAGES.map((s) => ({ stage: s, label: STAGE_LABEL[s], value: rows.find((r) => r.stage === s)?.n ?? 0 }));
}

export function upcomingInterviews(user: CurrentUser, days = 14, limit = 6) {
  const from = nowIso();
  const to = new Date(Date.now() + days * 86400000).toISOString();
  return db
    .select({
      id: schema.applications.id,
      at: schema.applications.interviewAt,
      name: schema.candidates.name,
      vacancy: schema.vacancies.title,
    })
    .from(schema.applications)
    .innerJoin(schema.candidates, eq(schema.candidates.id, schema.applications.candidateId))
    .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
    .where(
      and(
        eq(schema.applications.outcome, "EM_ANDAMENTO"),
        isNotNull(schema.applications.interviewAt),
        gte(schema.applications.interviewAt, from),
        lte(schema.applications.interviewAt, to),
        vacanciesScope(user),
      ),
    )
    .orderBy(asc(schema.applications.interviewAt))
    .limit(limit)
    .all();
}

export function upcomingVacations(scope: SQL | undefined, days = 30, limit = 6) {
  const today = todayISO();
  return db
    .select({
      id: schema.vacations.id,
      start: schema.vacations.startDate,
      end: schema.vacations.endDate,
      days: schema.vacations.days,
      employeeId: schema.employees.id,
      name: schema.employees.name,
      department: schema.departments.name,
    })
    .from(schema.vacations)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.vacations.employeeId))
    .innerJoin(schema.departments, eq(schema.departments.id, schema.employees.departmentId))
    .where(and(eq(schema.vacations.status, "APROVADO"), gte(schema.vacations.endDate, today), lte(schema.vacations.startDate, addDays(today, days)), scope))
    .orderBy(asc(schema.vacations.startDate))
    .limit(limit)
    .all();
}

export function calendarEvents(month: string, scope: SQL | undefined, user?: CurrentUser): CalEvent[] {
  const start = `${month}-01`;
  const end = `${month}-31`;
  const vac = db
    .select({ s: schema.vacations.startDate, e: schema.vacations.endDate, status: schema.vacations.status, name: schema.employees.name, employeeId: schema.employees.id })
    .from(schema.vacations)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.vacations.employeeId))
    .where(and(inArray(schema.vacations.status, ["APROVADO", "PENDENTE"]), lte(schema.vacations.startDate, end), gte(schema.vacations.endDate, addDays(start, -7)), scope))
    .all();
  const events: CalEvent[] = vac.map((v) => ({
    start: v.s,
    end: v.e,
    label: v.name.split(" ")[0] + " " + (v.name.split(" ").slice(-1)[0]?.[0] ?? "") + ".",
    kind: v.status === "PENDENTE" ? "pending" : "vacation",
    href: `/rh/ferias?mes=${month}`,
  }));
  if (user) {
    const ints = db
      .select({ id: schema.applications.id, at: schema.applications.interviewAt, name: schema.candidates.name })
      .from(schema.applications)
      .innerJoin(schema.candidates, eq(schema.candidates.id, schema.applications.candidateId))
      .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
      .where(and(isNotNull(schema.applications.interviewAt), eq(schema.applications.outcome, "EM_ANDAMENTO"), vacanciesScope(user)))
      .all();
    for (const i of ints) {
      const d = new Date(i.at!).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
      if (d.startsWith(month)) {
        const t = new Date(i.at!).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
        events.push({ start: d, end: d, label: `${t} ${i.name.split(" ")[0]}`, kind: "interview", href: `/rh/candidatos/${i.id}` });
      }
    }
  }
  return events.sort((a, b) => (a.kind === "interview" ? -1 : 1) - (b.kind === "interview" ? -1 : 1));
}

export function departmentDistribution(scope?: SQL) {
  return db
    .select({ id: schema.departments.id, label: schema.departments.name, value: count(schema.employees.id) })
    .from(schema.departments)
    .leftJoin(schema.employees, and(eq(schema.employees.departmentId, schema.departments.id), ne(schema.employees.status, "DESLIGADO"), scope))
    .groupBy(schema.departments.id)
    .orderBy(desc(count(schema.employees.id)))
    .all();
}

export function pendingDocumentsCount(scope?: SQL) {
  return db
    .select({ n: count() })
    .from(schema.documents)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.documents.employeeId))
    .where(and(inArray(schema.documents.status, ["PENDENTE", "ENVIADO"]), scope))
    .get()!.n;
}

export function pendingRequestsCount(scope?: SQL) {
  return db
    .select({ n: count() })
    .from(schema.requests)
    .leftJoin(schema.employees, eq(schema.employees.id, schema.requests.employeeId))
    .where(and(inArray(schema.requests.status, ["PENDENTE", "EM_ANALISE"]), scope))
    .get()!.n;
}

export function pendingVacationsCount(scope?: SQL) {
  return db
    .select({ n: count() })
    .from(schema.vacations)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.vacations.employeeId))
    .where(and(eq(schema.vacations.status, "PENDENTE"), scope))
    .get()!.n;
}

export function recentActivity(limit = 8) {
  return db
    .select({ id: schema.auditLogs.id, actor: schema.auditLogs.actorLabel, action: schema.auditLogs.action, summary: schema.auditLogs.summary, at: schema.auditLogs.createdAt, entityType: schema.auditLogs.entityType, entityId: schema.auditLogs.entityId })
    .from(schema.auditLogs)
    .where(sql`${schema.auditLogs.action} NOT IN ('LOGIN','LOGOUT','LOGIN_FALHOU','DOWNLOAD')`)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit)
    .all();
}

export function requestsList(where: SQL | undefined, limit = 6) {
  const author = alias(schema.users, "author");
  return db
    .select({
      id: schema.requests.id,
      subject: schema.requests.subject,
      type: schema.requests.type,
      priority: schema.requests.priority,
      status: schema.requests.status,
      createdAt: schema.requests.createdAt,
      employeeName: schema.employees.name,
      authorName: author.name,
    })
    .from(schema.requests)
    .innerJoin(author, eq(author.id, schema.requests.authorUserId))
    .leftJoin(schema.employees, eq(schema.employees.id, schema.requests.employeeId))
    .where(where)
    .orderBy(sql`CASE ${schema.requests.priority} WHEN 'ALTA' THEN 0 WHEN 'MEDIA' THEN 1 ELSE 2 END`, desc(schema.requests.createdAt))
    .limit(limit)
    .all();
}

/** Admissões e desligamentos por mês nos últimos `months` meses. */
export function movementByMonth(months = 12, scope?: SQL) {
  const now = new Date();
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: d.toLocaleDateString("sv-SE").slice(0, 7), label: MONTHS_SHORT[d.getMonth()] };
  });
  const since = `${keys[0].key}-01`;
  const hires = db
    .select({ m: sql<string>`substr(${schema.employees.hiredAt}, 1, 7)`, n: count() })
    .from(schema.employees)
    .where(and(gte(schema.employees.hiredAt, since), scope))
    .groupBy(sql`substr(${schema.employees.hiredAt}, 1, 7)`)
    .all();
  const terms = db
    .select({ m: sql<string>`substr(${schema.employees.terminatedAt}, 1, 7)`, n: count() })
    .from(schema.employees)
    .where(and(isNotNull(schema.employees.terminatedAt), gte(schema.employees.terminatedAt, since), scope))
    .groupBy(sql`substr(${schema.employees.terminatedAt}, 1, 7)`)
    .all();
  return keys.map((k) => ({
    label: k.label,
    values: [hires.find((h) => h.m === k.key)?.n ?? 0, terms.find((t) => t.m === k.key)?.n ?? 0],
  }));
}

export { employeesScope };
