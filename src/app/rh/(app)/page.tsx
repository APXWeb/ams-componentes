import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  FileWarning,
  Inbox,
  Palmtree,
  UserPlus,
  Users,
  Activity,
  CalendarDays,
  GitBranch,
  Building2,
  FileText,
  Megaphone,
  Plus,
} from "lucide-react";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { PageHeader, Kpi, Funnel, HBars, DateChip } from "@/components/rh/ui";
import { MonthCalendar, monthFromParam } from "@/components/rh/calendar";
import { Badge, Empty, Panel } from "@/components/ui/bits";
import {
  activeApplicationsCount,
  activeEmployeesCount,
  calendarEvents,
  departmentDistribution,
  employeesScope,
  hiresSince,
  openVacanciesCount,
  pendingDocumentsCount,
  pendingRequestsCount,
  pendingVacationsCount,
  pipelineCounts,
  recentActivity,
  requestsList,
  upcomingInterviews,
  upcomingVacations,
} from "@/lib/rh-data";
import { vacanciesScope, visibleAnnouncementsWhere } from "@/lib/rh-scope";
import { AUDIT_LABEL, type AuditAction } from "@/lib/audit";
import { fmtDate, fmtDateShort, fmtTime, relative, todayISO, daysBetween } from "@/lib/format";
import { DOC_STATUS_LABEL, PRIORITY_LABEL, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL, VACATION_STATUS_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Painel" };

function greeting() {
  const h = Number(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function Painel({ searchParams }: PageProps<"/rh">) {
  const user = await requireUser();
  const month = monthFromParam((await searchParams).mes);
  if (can(user.role, "dashboard.rh")) return <HrDashboard user={user} month={month} />;
  if (can(user.role, "dashboard.team")) return <TeamDashboard user={user} month={month} />;
  return <EmployeeDashboard user={user} />;
}

/* ================================================================ RH / ADMIN */
function HrDashboard({ user, month }: { user: CurrentUser; month: string }) {
  const active = activeEmployeesCount();
  const hires90 = hiresSince(90);
  const openVac = openVacanciesCount();
  const inProcess = activeApplicationsCount();
  const interviews = upcomingInterviews(user, 14, 6);
  const interviews7 = upcomingInterviews(user, 7, 50).length;
  const vacs = upcomingVacations(undefined, 30, 6);
  const vacs30 = upcomingVacations(undefined, 30, 200).length;
  const pendReq = pendingRequestsCount();
  const pendDocs = pendingDocumentsCount();
  const pendVac = pendingVacationsCount();
  const pipeline = pipelineCounts(user);
  const depts = departmentDistribution();
  const activity = recentActivity(8);
  const reqs = requestsList(inArray(schema.requests.status, ["PENDENTE", "EM_ANALISE"]), 5);
  const today = todayISO();

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        title={`${greeting()}, ${user.name.split(" ")[0]}.`}
        description={
          pendReq + pendVac > 0
            ? `Há ${pendReq} solicitações e ${pendVac} pedidos de férias aguardando o RH.`
            : "Nenhuma pendência aguardando o RH."
        }
        actions={
          <>
            <Link href="/rh/recrutamento/vagas/nova" className="btn btn--outline">
              <Plus aria-hidden /> Nova vaga
            </Link>
            <Link href="/rh/funcionarios/novo" className="btn">
              <UserPlus aria-hidden /> Novo funcionário
            </Link>
          </>
        }
      />

      <div className="kpis">
        <Kpi icon={Users} label="Funcionários ativos" value={active} meta={<><span className="up">+{hires90}</span> admitidos em 90 dias</>} href="/rh/funcionarios" />
        <Kpi icon={UserPlus} label="Novas contratações" value={hires90} meta="Últimos 90 dias" href="/rh/funcionarios?ordem=admissao" />
        <Kpi icon={Briefcase} label="Vagas abertas" value={openVac} meta="Publicadas no site" href="/rh/recrutamento/vagas" />
        <Kpi icon={GitBranch} label="Candidatos em processo" value={inProcess} meta="Em todas as etapas" href="/rh/recrutamento" />
        <Kpi icon={CalendarClock} label="Entrevistas" value={interviews7} meta="Próximos 7 dias" href="/rh/recrutamento" />
        <Kpi icon={Palmtree} label="Férias próximas" value={vacs30} meta="Próximos 30 dias" href="/rh/ferias" />
        <Kpi icon={Inbox} label="Solicitações pendentes" value={pendReq} meta="Pendentes e em análise" href="/rh/solicitacoes" alert={pendReq > 0} />
        <Kpi icon={FileWarning} label="Documentos pendentes" value={pendDocs} meta="A enviar ou validar" href="/rh/documentos?status=pendentes" alert={pendDocs > 0} />
      </div>

      <div className="grid grid-main" style={{ marginBottom: 16 }}>
        <Panel
          title="Pipeline de recrutamento"
          icon={GitBranch}
          action={
            <Link href="/rh/recrutamento" className="btn btn--ghost btn--sm">
              Abrir quadro <ArrowRight className="btn__arrow" aria-hidden />
            </Link>
          }
        >
          <Funnel data={pipeline.map((p) => ({ label: p.label, value: p.value }))} />
        </Panel>
        <Panel title="Próximas entrevistas" icon={CalendarClock} bodyClass="">
          {interviews.length ? (
            <ul className="list">
              {interviews.map((i) => (
                <li key={i.id}>
                  <Link href={`/rh/candidatos/${i.id}`} className="list-item">
                    <DateChip date={i.at!} today={i.at!.slice(0, 10) === today} />
                    <span className="list-item__main">
                      <span className="list-item__title">{i.name}</span>
                      <span className="list-item__sub">
                        {fmtTime(i.at)} · {i.vacancy}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={CalendarClock} title="Sem entrevistas agendadas">
              Agende entrevistas na página de cada candidato.
            </Empty>
          )}
        </Panel>
      </div>

      <div className="grid grid-main" style={{ marginBottom: 16 }}>
        <Panel title="Agenda de férias e entrevistas" icon={CalendarDays} bodyClass="">
          <MonthCalendar month={month} events={calendarEvents(month, undefined, user)} basePath="/rh" />
        </Panel>
        <div className="grid" style={{ alignContent: "start" }}>
          <Panel title="Férias nos próximos 30 dias" icon={Palmtree} bodyClass="">
            {vacs.length ? (
              <ul className="list">
                {vacs.map((v) => (
                  <li key={v.id}>
                    <Link href={`/rh/funcionarios/${v.employeeId}?aba=ferias`} className="list-item">
                      <DateChip date={v.start} />
                      <span className="list-item__main">
                        <span className="list-item__title">{v.name}</span>
                        <span className="list-item__sub">
                          {v.start <= today ? "Em férias até " + fmtDateShort(v.end) : `${v.days} dias · ${v.department}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={Palmtree} title="Ninguém em férias nos próximos 30 dias" />
            )}
          </Panel>
          <Panel title="Funcionários por departamento" icon={Building2}>
            <HBars data={depts.map((d) => ({ label: d.label, value: d.value, href: `/rh/funcionarios?dep=${d.id}` }))} />
          </Panel>
        </div>
      </div>

      <div className="grid grid-main">
        <Panel title="Atividades recentes" icon={Activity} bodyClass="table-wrap">
          <table className="table table--stack">
            <thead>
              <tr>
                <th scope="col">Ação</th>
                <th scope="col">Descrição</th>
                <th scope="col">Usuário</th>
                <th scope="col">Quando</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.id}>
                  <td className="cell-main">
                    <Badge plain>{AUDIT_LABEL[a.action as AuditAction] ?? a.action}</Badge>
                  </td>
                  <td data-label="Descrição">{a.summary}</td>
                  <td data-label="Usuário" className="nowrap">
                    {a.actor}
                  </td>
                  <td data-label="Quando" className="nowrap subtle">
                    {relative(a.at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel
          title="Solicitações aguardando"
          icon={Inbox}
          bodyClass=""
          footer={
            <Link href="/rh/solicitacoes" className="link">
              Ver todas as solicitações
            </Link>
          }
        >
          {reqs.length ? (
            <ul className="list">
              {reqs.map((r) => (
                <li key={r.id}>
                  <Link href={`/rh/solicitacoes/${r.id}`} className="list-item">
                    <span className="list-item__main">
                      <span className="list-item__title">{r.subject}</span>
                      <span className="list-item__sub">
                        {r.employeeName ?? r.authorName} · {REQUEST_TYPE_LABEL[r.type]} · {relative(r.createdAt)}
                      </span>
                    </span>
                    <Badge status={r.priority}>{PRIORITY_LABEL[r.priority]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Inbox} title="Tudo em dia">
              Nenhuma solicitação aguardando resposta.
            </Empty>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ================================================================ GESTOR */
function TeamDashboard({ user, month }: { user: CurrentUser; month: string }) {
  const scope = employeesScope(user);
  const team = activeEmployeesCount(scope);
  const vacs = upcomingVacations(scope, 45, 8);
  const pendVac = pendingVacationsCount(scope);
  const pendReq = pendingRequestsCount(scope);
  const pipeline = pipelineCounts(user);
  const openVac = openVacanciesCount(vacanciesScope(user));
  const interviews = upcomingInterviews(user, 14, 5);
  const reqs = requestsList(and(inArray(schema.requests.status, ["PENDENTE", "EM_ANALISE"]), scope), 6);
  const dept = user.departmentId ? db.select({ name: schema.departments.name }).from(schema.departments).where(eq(schema.departments.id, user.departmentId)).get()?.name : null;

  return (
    <>
      <PageHeader eyebrow={dept ? `Gestão · ${dept}` : "Gestão"} title={`${greeting()}, ${user.name.split(" ")[0]}.`} description="Acompanhe sua equipe, as férias programadas e os processos seletivos da sua área." />
      <div className="kpis">
        <Kpi icon={Users} label="Equipe ativa" value={team} href="/rh/funcionarios" />
        <Kpi icon={Palmtree} label="Férias a aprovar pelo RH" value={pendVac} meta="Pedidos da equipe" href="/rh/ferias" />
        <Kpi icon={Inbox} label="Solicitações da equipe" value={pendReq} meta="Pendentes ou em análise" href="/rh/solicitacoes" />
        <Kpi icon={Briefcase} label="Vagas da área" value={openVac} meta={`${pipeline.slice(0, 5).reduce((a, b) => a + b.value, 0)} candidatos em processo`} href="/rh/recrutamento" />
      </div>
      <div className="grid grid-main" style={{ marginBottom: 16 }}>
        <Panel title="Férias da equipe" icon={CalendarDays} bodyClass="">
          <MonthCalendar month={month} events={calendarEvents(month, scope, user)} basePath="/rh" />
        </Panel>
        <div className="grid" style={{ alignContent: "start" }}>
          <Panel title="Próximas férias" icon={Palmtree} bodyClass="">
            {vacs.length ? (
              <ul className="list">
                {vacs.map((v) => (
                  <li key={v.id}>
                    <Link href={`/rh/funcionarios/${v.employeeId}?aba=ferias`} className="list-item">
                      <DateChip date={v.start} />
                      <span className="list-item__main">
                        <span className="list-item__title">{v.name}</span>
                        <span className="list-item__sub">
                          {v.days} dias · até {fmtDate(v.end)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={Palmtree} title="Sem férias programadas" />
            )}
          </Panel>
          <Panel title="Processos seletivos da área" icon={GitBranch}>
            <Funnel data={pipeline.map((p) => ({ label: p.label, value: p.value }))} />
            {interviews.length ? (
              <p className="small muted" style={{ marginTop: 14 }}>
                Próxima entrevista: <strong>{interviews[0].name}</strong>, {fmtDateShort(interviews[0].at)} às {fmtTime(interviews[0].at)}.
              </p>
            ) : null}
          </Panel>
        </div>
      </div>
      <Panel title="Solicitações da equipe" icon={Inbox} bodyClass="">
        {reqs.length ? (
          <ul className="list">
            {reqs.map((r) => (
              <li key={r.id}>
                <Link href={`/rh/solicitacoes/${r.id}`} className="list-item">
                  <span className="list-item__main">
                    <span className="list-item__title">{r.subject}</span>
                    <span className="list-item__sub">
                      {r.employeeName} · {REQUEST_TYPE_LABEL[r.type]} · {relative(r.createdAt)}
                    </span>
                  </span>
                  <Badge status={r.status}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={Inbox} title="Nenhuma solicitação em aberto na equipe" />
        )}
      </Panel>
    </>
  );
}

/* ================================================================ FUNCIONÁRIO */
function EmployeeDashboard({ user }: { user: CurrentUser }) {
  const empId = user.employeeId;
  const emp = empId
    ? db
        .select({ balance: schema.employees.vacationBalance, hiredAt: schema.employees.hiredAt, position: schema.positions.title })
        .from(schema.employees)
        .innerJoin(schema.positions, eq(schema.positions.id, schema.employees.positionId))
        .where(eq(schema.employees.id, empId))
        .get()
    : null;
  const today = todayISO();
  const nextVac = empId
    ? db
        .select()
        .from(schema.vacations)
        .where(and(eq(schema.vacations.employeeId, empId), inArray(schema.vacations.status, ["APROVADO", "PENDENTE"]), gte(schema.vacations.endDate, today)))
        .orderBy(schema.vacations.startDate)
        .get()
    : null;
  const docs = empId
    ? db.select().from(schema.documents).where(and(eq(schema.documents.employeeId, empId), inArray(schema.documents.status, ["PENDENTE", "RECUSADO"]))).all()
    : [];
  const myReqs = db.select().from(schema.requests).where(eq(schema.requests.authorUserId, user.id)).orderBy(desc(schema.requests.createdAt)).limit(4).all();
  const anns = db
    .select({ id: schema.announcements.id, title: schema.announcements.title, body: schema.announcements.body, priority: schema.announcements.priority, at: schema.announcements.publishedAt, read: schema.announcementReads.userId })
    .from(schema.announcements)
    .leftJoin(schema.announcementReads, and(eq(schema.announcementReads.announcementId, schema.announcements.id), eq(schema.announcementReads.userId, user.id)))
    .where(visibleAnnouncementsWhere(user))
    .orderBy(desc(schema.announcements.publishedAt))
    .limit(3)
    .all();
  const unread = anns.filter((a) => !a.read).length;


  return (
    <>
      <PageHeader
        eyebrow={emp?.position ?? "Colaborador"}
        title={`${greeting()}, ${user.name.split(" ")[0]}.`}
        description={docs.length ? `Você tem ${docs.length} ${docs.length === 1 ? "documento pendente" : "documentos pendentes"} para enviar ao RH.` : "Seu cadastro está em dia."}
        actions={
          <>
            <Link href="/rh/solicitacoes?nova=1" className="btn btn--outline">
              <Plus aria-hidden /> Nova solicitação
            </Link>
            <Link href="/rh/ferias?solicitar=1" className="btn">
              <Palmtree aria-hidden /> Solicitar férias
            </Link>
          </>
        }
      />
      <div className="kpis">
        <Kpi icon={Palmtree} label="Saldo de férias" value={`${emp?.balance ?? 0} dias`} meta="Disponíveis para solicitar" href="/rh/ferias" />
        <Kpi
          icon={CalendarDays}
          label="Próximas férias"
          value={nextVac ? fmtDateShort(nextVac.startDate) : "—"}
          meta={nextVac ? `${VACATION_STATUS_LABEL[nextVac.status]} · ${nextVac.days} dias${nextVac.startDate > today ? ` · em ${daysBetween(today, nextVac.startDate)} dias` : ""}` : "Nenhuma programada"}
          href="/rh/ferias"
        />
        <Kpi icon={FileText} label="Documentos pendentes" value={docs.length} href="/rh/documentos" alert={docs.length > 0} />
        <Kpi icon={Megaphone} label="Comunicados não lidos" value={unread} href="/rh/comunicados" alert={unread > 0} />
      </div>
      <div className="grid grid-2">
        <div className="grid" style={{ alignContent: "start" }}>
          <Panel
            title="Documentos que o RH pediu"
            icon={FileWarning}
            bodyClass=""
            footer={
              <Link href="/rh/documentos" className="link">
                Ir para meus documentos
              </Link>
            }
          >
            {docs.length ? (
              <ul className="list">
                {docs.map((d) => (
                  <li key={d.id} className="list-item">
                    <span className="list-item__main">
                      <span className="list-item__title">{d.title}</span>
                      <span className="list-item__sub">{d.dueDate ? `Prazo: ${fmtDate(d.dueDate)}` : "Sem prazo definido"}</span>
                    </span>
                    <Badge status={d.status}>{DOC_STATUS_LABEL[d.status]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={FileText} title="Nenhum documento pendente" />
            )}
          </Panel>
          <Panel
            title="Minhas solicitações"
            icon={Inbox}
            bodyClass=""
            footer={
              <Link href="/rh/solicitacoes" className="link">
                Ver histórico
              </Link>
            }
          >
            {myReqs.length ? (
              <ul className="list">
                {myReqs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/rh/solicitacoes/${r.id}`} className="list-item">
                      <span className="list-item__main">
                        <span className="list-item__title">{r.subject}</span>
                        <span className="list-item__sub">
                          {REQUEST_TYPE_LABEL[r.type]} · {relative(r.createdAt)}
                        </span>
                      </span>
                      <Badge status={r.status}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={Inbox} title="Você ainda não abriu solicitações" />
            )}
          </Panel>
        </div>
        <Panel
          title="Comunicados"
          icon={Megaphone}
          bodyClass=""
          footer={
            <Link href="/rh/comunicados" className="link">
              Ver todos
            </Link>
          }
        >
          {anns.length ? (
            anns.map((a) => (
              <article key={a.id} className={`ann ann--${a.priority} ${a.read ? "" : "is-unread"}`}>
                <div className="row between">
                  <h3 className="ann__title" style={{ fontFamily: "var(--font-body)", fontSize: "var(--fs-base)" }}>
                    {a.title}
                  </h3>
                  <span className="xsmall subtle nowrap">{relative(a.at)}</span>
                </div>
                <p className="ann__body">{a.body.length > 220 ? a.body.slice(0, 220) + "…" : a.body}</p>
              </article>
            ))
          ) : (
            <Empty icon={Megaphone} title="Nenhum comunicado" />
          )}
        </Panel>
      </div>
    </>
  );
}
