"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Palmtree, Hourglass, PlaneTakeoff, Wallet } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageHeader, Kpi } from "@/components/rh/ui";
import { MonthCalendar, monthFromParam } from "@/components/rh/calendar";
import { VacationRequestButton, VacationTable, type VacationRow } from "@/components/rh/vacations";
import { Panel } from "@/components/ui/bits";
import { useRh } from "@/components/rh/demo-app";
import { activeEmployeeOptions, calendarEvents, dept, employee, employeesScope } from "@/lib/demo/queries";
import { todayISO, addDays } from "@/lib/format";
import type { DemoData, Employee, Vacation } from "@/lib/demo/types";

function rows(d: DemoData, where: (v: Vacation, e: Employee) => boolean, order: "asc" | "desc" = "asc"): VacationRow[] {
  return d.vacations
    .map((v) => ({ v, e: employee(d, v.employeeId)! }))
    .filter(({ v, e }) => e && where(v, e))
    .sort((a, b) => (order === "asc" ? a.v.startDate.localeCompare(b.v.startDate) : b.v.startDate.localeCompare(a.v.startDate)))
    .map(({ v, e }) => ({ ...v, employeeName: e.name, department: dept(d, e.departmentId)?.name }));
}

export function FeriasView() {
  const { d, user } = useRh();
  const sp = useSearchParams();
  const month = monthFromParam(sp.get("mes"));
  const today = todayISO();
  const hr = can(user.role, "vacations.manage");
  const team = can(user.role, "vacations.view_team");

  if (hr || team) {
    const scope = hr ? () => true : employeesScope(user);
    const pending = rows(d, (v, e) => v.status === "PENDENTE" && scope(e));
    const upcoming = rows(d, (v, e) => v.status === "APROVADO" && v.endDate >= today && scope(e));
    const history = rows(d, (v, e) => (v.endDate < today || v.status === "RECUSADO" || v.status === "CANCELADO") && scope(e), "desc").slice(0, 40);
    const ongoing = upcoming.filter((u) => u.startDate <= today).length;
    const next30 = upcoming.filter((u) => u.startDate > today && u.startDate <= addDays(today, 30)).length;
    const view = sp.get("ver") ?? (pending.length && hr ? "pendentes" : "proximas");
    const own = user.employeeId ? employee(d, user.employeeId) : undefined;

    return (
      <>
        <PageHeader
          eyebrow={hr ? "Gestão" : "Minha equipe"}
          title="Férias"
          description={hr ? "Aprove pedidos, acompanhe o calendário e registre períodos." : "Calendário e pedidos de férias da sua equipe. A aprovação é feita pelo RH."}
          actions={
            <>
              {own && !hr ? <VacationRequestButton balance={own.vacationBalance} /> : null}
              {hr ? <VacationRequestButton employees={activeEmployeeOptions(d)} /> : null}
            </>
          }
        />
        <div className="kpis">
          <Kpi icon={Hourglass} label="Aguardando aprovação" value={pending.length} alert={pending.length > 0 && hr} href="/rh/ferias?ver=pendentes" />
          <Kpi icon={PlaneTakeoff} label="Em férias hoje" value={ongoing} href="/rh/ferias?ver=proximas" />
          <Kpi icon={CalendarDays} label="Saem nos próximos 30 dias" value={next30} href="/rh/ferias?ver=proximas" />
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
            <div className="tab-panel" key={view}>
              <VacationTable rows={view === "pendentes" ? pending : view === "historico" ? history : upcoming} review={hr && view === "pendentes"} hrCancel={hr} cancelOwnFor={user.employeeId} />
            </div>
          </section>
          <Panel title="Calendário" icon={CalendarDays} bodyClass="">
            <MonthCalendar month={month} events={calendarEvents(d, month, scope)} basePath={`/rh/ferias?ver=${view}`} maxPerDay={4} />
          </Panel>
        </div>
      </>
    );
  }

  // FUNCIONÁRIO
  const emp = employee(d, user.employeeId);
  const mine = emp ? rows(d, (v) => v.employeeId === emp.id, "desc") : [];
  const pendingDays = mine.filter((m) => m.status === "PENDENTE").reduce((a, b) => a + b.days, 0);
  const next = mine.filter((m) => m.status === "APROVADO" && m.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return (
    <>
      <PageHeader
        eyebrow="Meu espaço"
        title="Minhas férias"
        description="Solicite períodos de 5 a 30 dias. O RH analisa e responde por aqui."
        actions={emp ? <VacationRequestButton balance={emp.vacationBalance} open={sp.get("solicitar") === "1"} /> : null}
      />
      <div className="kpis">
        <Kpi icon={Wallet} label="Saldo disponível" value={`${emp?.vacationBalance ?? 0} dias`} />
        <Kpi icon={Hourglass} label="Em pedidos pendentes" value={`${pendingDays} dias`} />
        <Kpi icon={PlaneTakeoff} label="Próximas férias" value={next ? next.startDate.split("-").reverse().slice(0, 2).join("/") : "—"} meta={next ? `${next.days} dias aprovados` : "Nenhuma aprovada"} />
        <Kpi icon={Palmtree} label="Períodos registrados" value={mine.length} />
      </div>
      <div className="grid">
        <section className="panel">
          <VacationTable rows={mine} showEmployee={false} cancelOwnFor={user.employeeId} />
        </section>
        <Panel title="Calendário" icon={CalendarDays} bodyClass="">
          <MonthCalendar month={month} events={calendarEvents(d, month, (e) => e.id === emp?.id)} basePath="/rh/ferias" maxPerDay={2} />
        </Panel>
      </div>
    </>
  );
}
