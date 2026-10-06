import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt, or, type SQL } from "drizzle-orm";
import { CalendarDays, Palmtree, Hourglass, PlaneTakeoff, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { employeesScope } from "@/lib/rh-scope";
import { calendarEvents } from "@/lib/rh-data";
import { PageHeader, Kpi } from "@/components/rh/ui";
import { MonthCalendar, monthFromParam } from "@/components/rh/calendar";
import { VacationRequestButton, VacationTable, type VacationRow } from "@/components/rh/vacations";
import { Panel } from "@/components/ui/bits";
import { activeEmployeeOptions } from "@/lib/rh-options";
import { todayISO, addDays } from "@/lib/format";

export const metadata: Metadata = { title: "Férias" };

function rowsWhere(where: SQL | undefined, order: "asc" | "desc" = "asc"): VacationRow[] {
  return db
    .select({
      id: schema.vacations.id,
      employeeId: schema.vacations.employeeId,
      employeeName: schema.employees.name,
      department: schema.departments.name,
      startDate: schema.vacations.startDate,
      endDate: schema.vacations.endDate,
      days: schema.vacations.days,
      status: schema.vacations.status,
      note: schema.vacations.note,
      reviewNote: schema.vacations.reviewNote,
      createdAt: schema.vacations.createdAt,
    })
    .from(schema.vacations)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.vacations.employeeId))
    .innerJoin(schema.departments, eq(schema.departments.id, schema.employees.departmentId))
    .where(where)
    .orderBy(order === "asc" ? asc(schema.vacations.startDate) : desc(schema.vacations.startDate))
    .all();
}

export default async function FeriasPage({ searchParams }: PageProps<"/rh/ferias">) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = monthFromParam(sp.mes);
  const today = todayISO();
  const hr = can(user.role, "vacations.manage");
  const team = can(user.role, "vacations.view_team");

  if (hr || team) {
    const scope = hr ? undefined : employeesScope(user);
    const pending = rowsWhere(and(eq(schema.vacations.status, "PENDENTE"), scope));
    const upcoming = rowsWhere(and(eq(schema.vacations.status, "APROVADO"), gte(schema.vacations.endDate, today), scope));
    const history = rowsWhere(and(or(lt(schema.vacations.endDate, today), inArray(schema.vacations.status, ["RECUSADO", "CANCELADO"])), scope), "desc").slice(0, 30);
    const ongoing = upcoming.filter((u) => u.startDate <= today).length;
    const next30 = upcoming.filter((u) => u.startDate > today && u.startDate <= addDays(today, 30)).length;
    const view = typeof sp.ver === "string" ? sp.ver : pending.length && hr ? "pendentes" : "proximas";

    return (
      <>
        <PageHeader
          eyebrow={hr ? "Gestão" : "Minha equipe"}
          title="Férias"
          description={hr ? "Aprove pedidos, acompanhe o calendário e registre períodos." : "Calendário e pedidos de férias da sua equipe. A aprovação é feita pelo RH."}
          actions={
            <>
              {user.employeeId && !hr ? <VacationRequestButton balance={db.select({ b: schema.employees.vacationBalance }).from(schema.employees).where(eq(schema.employees.id, user.employeeId)).get()?.b} /> : null}
              {hr ? <VacationRequestButton employees={activeEmployeeOptions()} /> : null}
            </>
          }
        />
        <div className="kpis">
          <Kpi icon={Hourglass} label="Aguardando aprovação" value={pending.length} alert={pending.length > 0 && hr} />
          <Kpi icon={PlaneTakeoff} label="Em férias hoje" value={ongoing} />
          <Kpi icon={CalendarDays} label="Saem nos próximos 30 dias" value={next30} />
          <Kpi icon={Palmtree} label="Períodos aprovados a vencer" value={upcoming.length} />
        </div>
        <div className="grid">
          <section className="panel">
            <nav className="seg" style={{ margin: 12 }} aria-label="Listas de férias">
              <Link href={`/rh/ferias?ver=pendentes&mes=${month}`} aria-current={view === "pendentes" ? "page" : undefined} scroll={false}>
                Pendentes ({pending.length})
              </Link>
              <Link href={`/rh/ferias?ver=proximas&mes=${month}`} aria-current={view === "proximas" ? "page" : undefined} scroll={false}>
                Programadas ({upcoming.length})
              </Link>
              <Link href={`/rh/ferias?ver=historico&mes=${month}`} aria-current={view === "historico" ? "page" : undefined} scroll={false}>
                Histórico
              </Link>
            </nav>
            <VacationTable rows={view === "pendentes" ? pending : view === "historico" ? history : upcoming} review={hr && view === "pendentes"} hrCancel={hr} cancelOwnFor={user.employeeId} />
          </section>
          <Panel title="Calendário" icon={CalendarDays} bodyClass="">
            <MonthCalendar month={month} events={calendarEvents(month, scope).filter((e) => e.kind !== "interview")} basePath="/rh/ferias" maxPerDay={4} />
          </Panel>
        </div>
      </>
    );
  }

  // FUNCIONÁRIO
  const empId = user.employeeId;
  const emp = empId ? db.select({ b: schema.employees.vacationBalance }).from(schema.employees).where(eq(schema.employees.id, empId)).get() : null;
  const mine = empId ? rowsWhere(eq(schema.vacations.employeeId, empId), "desc") : [];
  const pendingDays = mine.filter((m) => m.status === "PENDENTE").reduce((a, b) => a + b.days, 0);
  const next = mine.filter((m) => m.status === "APROVADO" && m.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return (
    <>
      <PageHeader
        eyebrow="Meu espaço"
        title="Minhas férias"
        description="Solicite períodos de 5 a 30 dias. O RH analisa e responde por aqui."
        actions={empId ? <VacationRequestButton balance={emp?.b} open={sp.solicitar === "1"} /> : null}
      />
      <div className="kpis">
        <Kpi icon={Wallet} label="Saldo disponível" value={`${emp?.b ?? 0} dias`} />
        <Kpi icon={Hourglass} label="Em pedidos pendentes" value={`${pendingDays} dias`} />
        <Kpi icon={PlaneTakeoff} label="Próximas férias" value={next ? next.startDate.split("-").reverse().slice(0, 2).join("/") : "—"} meta={next ? `${next.days} dias aprovados` : "Nenhuma aprovada"} />
        <Kpi icon={Palmtree} label="Períodos registrados" value={mine.length} />
      </div>
      <section className="panel">
        <VacationTable rows={mine} showEmployee={false} cancelOwnFor={empId} />
      </section>
    </>
  );
}
