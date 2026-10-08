/*
 * Consultas sobre os dados de demonstração. São funções puras (dados + usuário -> resultado),
 * no mesmo papel que as consultas SQL teriam no backend real, incluindo o escopo de cada perfil:
 * o que cada usuário enxerga é decidido aqui, não nas telas.
 */
import { can } from "@/lib/permissions";
import { addDays, MONTHS_SHORT, todayISO } from "@/lib/format";
import { STAGE_LABEL } from "@/lib/labels";
import { STAGES, type CurrentUser, type DemoData, type Employee, type RequestRow, type Vacancy } from "./types";

export type CalEvent = { start: string; end: string; label: string; kind: "vacation" | "pending" | "interview"; href?: string; detail?: string };
type Pred<T> = (x: T) => boolean;
const all = () => true;

/* ----------------------------------------------------------- relações */

export const dept = (d: DemoData, id: number | null | undefined) => d.departments.find((x) => x.id === id);
export const position = (d: DemoData, id: number | null | undefined) => d.positions.find((x) => x.id === id);
export const employee = (d: DemoData, id: number | null | undefined) => (id ? d.employees.find((x) => x.id === id) : undefined);
export const userById = (d: DemoData, id: number | null | undefined) => (id ? d.users.find((x) => x.id === id) : undefined);
export const candidate = (d: DemoData, id: number) => d.candidates.find((x) => x.id === id);
export const vacancy = (d: DemoData, id: number) => d.vacancies.find((x) => x.id === id);
export const userOfEmployee = (d: DemoData, employeeId: number) => d.users.find((u) => u.employeeId === employeeId);

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const matches = (q: string, ...fields: (string | null | undefined)[]) => {
  const n = norm(q.trim());
  return !n || fields.some((f) => f && norm(f).includes(n));
};

/* --------------------------------------------------------------- escopo */

/** Funcionários visíveis: RH/Admin todos; gestor a própria equipe; funcionário só a si mesmo. */
export function employeesScope(user: CurrentUser): Pred<Employee> {
  if (can(user.role, "employees.view_all")) return all;
  if (can(user.role, "employees.view_team")) return (e) => e.departmentId === user.departmentId || e.managerId === user.employeeId || e.id === user.employeeId;
  return (e) => e.id === user.employeeId;
}

export function canSeeEmployee(user: CurrentUser, e: Employee) {
  return employeesScope(user)(e);
}

/** Vagas visíveis no recrutamento: RH/Admin todas; gestor apenas as do seu departamento. */
export function vacanciesScope(user: CurrentUser): Pred<Vacancy> {
  if (can(user.role, "recruitment.manage")) return all;
  if (can(user.role, "recruitment.view") && user.departmentId) return (v) => v.departmentId === user.departmentId;
  return () => false;
}

/** Comunicados publicados e dirigidos ao usuário. */
export function visibleAnnouncements(d: DemoData, user: CurrentUser) {
  const now = new Date().toISOString();
  return d.announcements
    .filter((a) => a.publishedAt <= now && (!a.expiresAt || a.expiresAt > now))
    .filter((a) => can(user.role, "announcements.manage") || a.audience === "TODOS" || (a.audience === "DEPARTAMENTO" && a.audienceDepartmentId === user.departmentId) || (a.audience === "GESTORES" && user.role === "GESTOR"))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export const isRead = (d: DemoData, announcementId: number, userId: number) => d.announcementReads.some((r) => r.announcementId === announcementId && r.userId === userId);

/* ------------------------------------------------------------- contagens */

const empOk = (d: DemoData, scope: Pred<Employee>, employeeId: number | null) => {
  const e = employee(d, employeeId);
  return !!e && scope(e);
};

export const activeEmployees = (d: DemoData, scope: Pred<Employee> = all) => d.employees.filter((e) => e.status !== "DESLIGADO" && scope(e));
export const activeEmployeesCount = (d: DemoData, scope: Pred<Employee> = all) => activeEmployees(d, scope).length;
export const hiresSince = (d: DemoData, days: number, scope: Pred<Employee> = all) => d.employees.filter((e) => e.hiredAt >= addDays(todayISO(), -days) && scope(e)).length;
export const openVacanciesCount = (d: DemoData, scope: Pred<Vacancy> = all) => d.vacancies.filter((v) => v.status === "ABERTA" && scope(v)).length;

export function activeApplicationsCount(d: DemoData, scope: Pred<Vacancy> = all) {
  return d.applications.filter((a) => a.outcome === "EM_ANDAMENTO" && scope(vacancy(d, a.vacancyId)!)).length;
}

export function pipelineCounts(d: DemoData, user: CurrentUser) {
  const scope = vacanciesScope(user);
  const apps = d.applications.filter((a) => (a.outcome === "EM_ANDAMENTO" || a.outcome === "CONTRATADO") && scope(vacancy(d, a.vacancyId)!));
  return STAGES.map((s) => ({ stage: s, label: STAGE_LABEL[s], value: apps.filter((a) => a.stage === s).length }));
}

export function upcomingInterviews(d: DemoData, user: CurrentUser, days = 14, limit = 6) {
  const from = new Date().toISOString();
  const to = new Date(Date.now() + days * 86400000).toISOString();
  const scope = vacanciesScope(user);
  return d.applications
    .filter((a) => a.outcome === "EM_ANDAMENTO" && a.interviewAt && a.interviewAt >= from && a.interviewAt <= to && scope(vacancy(d, a.vacancyId)!))
    .sort((a, b) => a.interviewAt!.localeCompare(b.interviewAt!))
    .slice(0, limit)
    .map((a) => ({ id: a.id, at: a.interviewAt!, name: candidate(d, a.candidateId)!.name, vacancy: vacancy(d, a.vacancyId)!.title }));
}

export function upcomingVacations(d: DemoData, scope: Pred<Employee> = all, days = 30, limit = 6) {
  const today = todayISO();
  return d.vacations
    .filter((v) => v.status === "APROVADO" && v.endDate >= today && v.startDate <= addDays(today, days) && empOk(d, scope, v.employeeId))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit)
    .map((v) => {
      const e = employee(d, v.employeeId)!;
      return { id: v.id, start: v.startDate, end: v.endDate, days: v.days, employeeId: e.id, name: e.name, department: dept(d, e.departmentId)!.name };
    });
}

const shortName = (n: string) => n.split(" ")[0] + " " + (n.split(" ").slice(-1)[0]?.[0] ?? "") + ".";

export function calendarEvents(d: DemoData, month: string, scope: Pred<Employee> = all, user?: CurrentUser): CalEvent[] {
  const start = `${month}-01`;
  const end = `${month}-31`;
  const events: CalEvent[] = d.vacations
    .filter((v) => (v.status === "APROVADO" || v.status === "PENDENTE") && v.startDate <= end && v.endDate >= addDays(start, -7) && empOk(d, scope, v.employeeId))
    .map((v) => {
      const e = employee(d, v.employeeId)!;
      return {
        start: v.startDate,
        end: v.endDate,
        label: shortName(e.name),
        kind: v.status === "PENDENTE" ? "pending" : "vacation",
        href: `/rh/funcionarios/${e.id}?aba=ferias`,
        detail: `${e.name} · ${v.status === "PENDENTE" ? "férias pendentes" : "férias"} · ${v.days} dias`,
      };
    });
  if (user) {
    const vs = vacanciesScope(user);
    for (const a of d.applications) {
      if (!a.interviewAt || a.outcome !== "EM_ANDAMENTO" || !vs(vacancy(d, a.vacancyId)!)) continue;
      const iso = new Date(a.interviewAt).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
      if (!iso.startsWith(month)) continue;
      const t = new Date(a.interviewAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
      const c = candidate(d, a.candidateId)!;
      events.push({ start: iso, end: iso, label: `${t} ${c.name.split(" ")[0]}`, kind: "interview", href: `/rh/candidatos/${a.id}`, detail: `Entrevista às ${t} · ${c.name} · ${vacancy(d, a.vacancyId)!.title}` });
    }
  }
  return events.sort((a, b) => (a.kind === "interview" ? -1 : 1) - (b.kind === "interview" ? -1 : 1));
}

export function departmentDistribution(d: DemoData, scope: Pred<Employee> = all) {
  return d.departments
    .map((x) => ({ id: x.id, label: x.name, value: d.employees.filter((e) => e.departmentId === x.id && e.status !== "DESLIGADO" && scope(e)).length }))
    .sort((a, b) => b.value - a.value);
}

export function pendingDocumentsCount(d: DemoData, scope: Pred<Employee> = all) {
  return d.documents.filter((x) => (x.status === "PENDENTE" || x.status === "ENVIADO") && empOk(d, scope, x.employeeId)).length;
}

export function pendingRequestsCount(d: DemoData, scope: Pred<Employee> = all) {
  return d.requests.filter((r) => (r.status === "PENDENTE" || r.status === "EM_ANALISE") && (scope === all || empOk(d, scope, r.employeeId))).length;
}

export function pendingVacationsCount(d: DemoData, scope: Pred<Employee> = all) {
  return d.vacations.filter((v) => v.status === "PENDENTE" && empOk(d, scope, v.employeeId)).length;
}

export function recentActivity(d: DemoData, limit = 8) {
  return d.auditLogs
    .filter((a) => !["LOGIN", "LOGOUT", "LOGIN_FALHOU", "DOWNLOAD"].includes(a.action))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    .slice(0, limit);
}

export type RequestListRow = RequestRow & { employeeName: string | null; authorName: string };
const PRIO = { ALTA: 0, MEDIA: 1, BAIXA: 2 } as const;

export function requestsList(d: DemoData, where: Pred<RequestListRow> = all, limit = 6): RequestListRow[] {
  return d.requests
    .map((r) => ({ ...r, employeeName: employee(d, r.employeeId)?.name ?? null, authorName: userById(d, r.authorUserId)?.name ?? "—" }))
    .filter(where)
    .sort((a, b) => PRIO[a.priority] - PRIO[b.priority] || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/** Admissões e desligamentos por mês nos últimos `months` meses. */
export function movementByMonth(d: DemoData, months = 12, scope: Pred<Employee> = all) {
  const now = new Date();
  const keys = Array.from({ length: months }, (_, i) => {
    const x = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: x.toLocaleDateString("sv-SE").slice(0, 7), label: MONTHS_SHORT[x.getMonth()] };
  });
  const emps = d.employees.filter(scope);
  return keys.map((k) => ({
    label: k.label,
    values: [emps.filter((e) => e.hiredAt.startsWith(k.key)).length, emps.filter((e) => e.terminatedAt?.startsWith(k.key)).length],
  }));
}

/* ------------------------------------------------------- opções de formulário */

/** Cargos agrupados por departamento para selects. */
export function positionOptions(d: DemoData) {
  return [...d.departments]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((x) => ({
      department: x.name,
      items: d.positions
        .filter((p) => p.departmentId === x.id)
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((p) => ({ value: p.id, label: p.title })),
    }));
}

export function activeEmployeeOptions(d: DemoData) {
  return d.employees
    .filter((e) => e.status !== "DESLIGADO")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({ value: e.id, label: e.name }));
}

export function departmentOptions(d: DemoData) {
  return [...d.departments].sort((a, b) => a.name.localeCompare(b.name)).map((x) => ({ value: x.id, label: x.name }));
}

/* ------------------------------------------------------------ busca global */

export type SearchHit = { group: string; label: string; href: string; meta?: string; kind: "page" | "employee" | "candidate" | "vacancy" };

/** Busca global respeitando o escopo de cada perfil (gestor só vê a equipe; funcionário só páginas). */
export function globalSearch(d: DemoData, user: CurrentUser, q: string): SearchHit[] {
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  const hits: SearchHit[] = [];
  if (can(user.role, "employees.view_all") || can(user.role, "employees.view_team")) {
    const scope = employeesScope(user);
    hits.push(
      ...d.employees
        .filter((e) => scope(e) && matches(term, e.name, e.corporateEmail, position(d, e.positionId)?.title))
        .slice(0, 6)
        .map((e) => ({ group: "Funcionários", label: e.name, href: `/rh/funcionarios/${e.id}`, meta: position(d, e.positionId)?.title, kind: "employee" as const })),
    );
  }
  if (can(user.role, "recruitment.view")) {
    const vs = vacanciesScope(user);
    hits.push(...d.vacancies.filter((v) => vs(v) && matches(term, v.title)).slice(0, 5).map((v) => ({ group: "Vagas", label: v.title, href: `/rh/recrutamento?vaga=${v.id}`, kind: "vacancy" as const })));
    hits.push(
      ...d.applications
        .filter((a) => vs(vacancy(d, a.vacancyId)!))
        .map((a) => ({ a, c: candidate(d, a.candidateId)! }))
        .filter(({ c }) => matches(term, c.name, c.email))
        .sort((x, y) => y.a.createdAt.localeCompare(x.a.createdAt))
        .slice(0, 6)
        .map(({ a, c }) => ({ group: "Candidatos", label: c.name, href: `/rh/candidatos/${a.id}`, meta: vacancy(d, a.vacancyId)!.title, kind: "candidate" as const })),
    );
  }
  return hits;
}

/* ------------------------------------------------------------ notificações */

export type Notice = { id: string; title: string; detail: string; href: string; at: string; tone: "info" | "warning" | "success" | "danger"; icon: "candidate" | "vacation" | "request" | "document" | "announcement" | "interview" };

/** Notificações derivadas dos dados (o backend real geraria a partir de eventos). */
export function notifications(d: DemoData, user: CurrentUser): Notice[] {
  const out: Notice[] = [];
  const hr = can(user.role, "requests.manage");
  if (can(user.role, "recruitment.manage")) {
    for (const a of d.applications.filter((x) => x.stage === "CANDIDATO" && x.outcome === "EM_ANDAMENTO").sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 4)) {
      out.push({ id: `app-${a.id}`, title: "Nova candidatura", detail: `${candidate(d, a.candidateId)!.name} · ${vacancy(d, a.vacancyId)!.title}`, href: `/rh/candidatos/${a.id}`, at: a.createdAt, tone: "info", icon: "candidate" });
    }
  }
  if (can(user.role, "recruitment.view")) {
    for (const i of upcomingInterviews(d, user, 2, 3)) out.push({ id: `int-${i.id}-${i.at}`, title: "Entrevista em breve", detail: `${i.name} · ${new Date(i.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit" })}`, href: `/rh/candidatos/${i.id}`, at: new Date(Date.now() - 3600000).toISOString(), tone: "warning", icon: "interview" });
  }
  if (hr) {
    for (const v of d.vacations.filter((x) => x.status === "PENDENTE").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)) {
      out.push({ id: `vac-${v.id}`, title: "Férias aguardando aprovação", detail: `${employee(d, v.employeeId)!.name} · ${v.days} dias`, href: `/rh/ferias?ver=pendentes`, at: v.createdAt, tone: "warning", icon: "vacation" });
    }
    for (const r of d.requests.filter((x) => x.status === "PENDENTE").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)) {
      out.push({ id: `req-${r.id}`, title: r.priority === "ALTA" ? "Solicitação com prioridade alta" : "Nova solicitação", detail: `${r.subject} · ${employee(d, r.employeeId)?.name ?? ""}`, href: `/rh/solicitacoes/${r.id}`, at: r.createdAt, tone: r.priority === "ALTA" ? "danger" : "info", icon: "request" });
    }
    for (const x of d.documents.filter((x) => x.status === "ENVIADO" && x.employeeId).slice(0, 2)) {
      out.push({ id: `doc-${x.id}`, title: "Documento para validar", detail: `${x.title} · ${employee(d, x.employeeId)!.name}`, href: `/rh/documentos?status=ENVIADO`, at: x.uploadedAt ?? x.createdAt, tone: "info", icon: "document" });
    }
  } else {
    for (const r of d.requests.filter((x) => x.authorUserId === user.id && x.respondedAt).slice(0, 3)) {
      out.push({ id: `resp-${r.id}-${r.status}`, title: "O RH respondeu sua solicitação", detail: r.subject, href: `/rh/solicitacoes/${r.id}`, at: r.respondedAt!, tone: "success", icon: "request" });
    }
    for (const v of d.vacations.filter((x) => x.employeeId === user.employeeId && x.reviewedAt && x.status !== "CANCELADO").slice(-2)) {
      out.push({ id: `myvac-${v.id}-${v.status}`, title: v.status === "APROVADO" ? "Férias aprovadas" : "Pedido de férias recusado", detail: `${v.startDate.split("-").reverse().join("/")} · ${v.days} dias`, href: "/rh/ferias", at: v.reviewedAt!, tone: v.status === "APROVADO" ? "success" : "danger", icon: "vacation" });
    }
    for (const x of d.documents.filter((x) => x.employeeId === user.employeeId && (x.status === "PENDENTE" || x.status === "RECUSADO"))) {
      out.push({ id: `mydoc-${x.id}-${x.status}`, title: x.status === "RECUSADO" ? "Documento recusado" : "O RH pediu um documento", detail: x.title, href: "/rh/documentos", at: x.reviewedAt ?? x.createdAt, tone: x.status === "RECUSADO" ? "danger" : "warning", icon: "document" });
    }
  }
  for (const a of visibleAnnouncements(d, user).filter((x) => !isRead(d, x.id, user.id)).slice(0, 3)) {
    out.push({ id: `ann-${a.id}`, title: a.priority === "URGENTE" ? "Comunicado urgente" : "Novo comunicado", detail: a.title, href: "/rh/comunicados", at: a.publishedAt, tone: a.priority === "URGENTE" ? "danger" : "info", icon: "announcement" });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
