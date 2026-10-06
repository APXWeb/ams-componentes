import type { Metadata } from "next";
import { and, count, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { Activity, Building2, GitBranch, Inbox, Palmtree, TrendingDown, UserMinus, UserPlus, Users, Briefcase, Timer, Hourglass } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { PageHeader, Kpi, HBars, Funnel, Columns, Donut } from "@/components/rh/ui";
import { Panel } from "@/components/ui/bits";
import { activeEmployeesCount, departmentDistribution, movementByMonth, openVacanciesCount, pipelineCounts } from "@/lib/rh-data";
import { EMPLOYMENT_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { addDays, daysBetween, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Indicadores" };

export default async function IndicadoresPage() {
  const user = await requireUser("indicators.view");
  const today = todayISO();
  const yearAgo = addDays(today, -365);

  const headcount = activeEmployeesCount();
  const movement = movementByMonth(12);
  const hires12 = movement.reduce((a, m) => a + m.values[0], 0);
  const terms12 = movement.reduce((a, m) => a + m.values[1], 0);
  const turnover = headcount ? ((((hires12 + terms12) / 2) / headcount) * 100).toFixed(1).replace(".", ",") : "0";
  const depts = departmentDistribution();
  const pipeline = pipelineCounts(user);
  const openVac = openVacanciesCount();

  // tempo médio entre a candidatura e a contratação
  const hiredApps = db
    .select({ created: schema.applications.createdAt, done: schema.applicationEvents.createdAt })
    .from(schema.applications)
    .innerJoin(schema.applicationEvents, and(eq(schema.applicationEvents.applicationId, schema.applications.id), eq(schema.applicationEvents.type, "CONTRATACAO")))
    .all();
  const timeToHire = hiredApps.length ? Math.round(hiredApps.reduce((a, h) => a + daysBetween(h.created.slice(0, 10), h.done.slice(0, 10)), 0) / hiredApps.length) : null;
  const totalApps = db.select({ n: count() }).from(schema.applications).get()!.n;
  const hiredTotal = db.select({ n: count() }).from(schema.applications).where(eq(schema.applications.outcome, "CONTRATADO")).get()!.n;

  const vac = db
    .select({ status: schema.vacations.status, n: count(), days: sql<number>`sum(${schema.vacations.days})` })
    .from(schema.vacations)
    .where(gte(schema.vacations.startDate, yearAgo))
    .groupBy(schema.vacations.status)
    .all();
  const vacDays = (s: string) => vac.find((v) => v.status === s)?.days ?? 0;
  const vacN = (s: string) => vac.find((v) => v.status === s)?.n ?? 0;
  const noBalance = db.select({ n: count() }).from(schema.employees).where(and(ne(schema.employees.status, "DESLIGADO"), sql`${schema.employees.vacationBalance} >= 30`)).get()!.n;

  const reqTypes = db.select({ type: schema.requests.type, n: count() }).from(schema.requests).groupBy(schema.requests.type).all();
  const reqOpen = db.select({ n: count() }).from(schema.requests).where(inArray(schema.requests.status, ["PENDENTE", "EM_ANALISE"])).get()!.n;
  const answered = db
    .select({ c: schema.requests.createdAt, r: schema.requests.respondedAt })
    .from(schema.requests)
    .where(isNotNull(schema.requests.respondedAt))
    .all();
  const responseHours = answered.length ? Math.round(answered.reduce((a, x) => a + (Date.parse(x.r!) - Date.parse(x.c)) / 3600000, 0) / answered.length) : null;

  const tenures = db.select({ h: schema.employees.hiredAt }).from(schema.employees).where(ne(schema.employees.status, "DESLIGADO")).all();
  const buckets = [
    { label: "Até 1 ano", max: 1 },
    { label: "1 a 3 anos", max: 3 },
    { label: "3 a 5 anos", max: 5 },
    { label: "5 a 10 anos", max: 10 },
    { label: "Mais de 10 anos", max: 999 },
  ].map((b, i, arr) => ({
    label: b.label,
    value: tenures.filter((t) => {
      const y = daysBetween(t.h, today) / 365;
      return y < b.max && y >= (i ? arr[i - 1].max : 0);
    }).length,
  }));
  const types = db.select({ t: schema.employees.employmentType, n: count() }).from(schema.employees).where(ne(schema.employees.status, "DESLIGADO")).groupBy(schema.employees.employmentType).all();

  return (
    <>
      <PageHeader eyebrow="Visão geral" title="Indicadores" description="Quadro de pessoal, recrutamento, férias e atendimento do RH nos últimos 12 meses." />

      <div className="kpis">
        <Kpi icon={Users} label="Quadro ativo" value={headcount} meta={types.map((t) => `${t.n} ${EMPLOYMENT_LABEL[t.t].toLowerCase().replace("clt", "CLT")}`).join(" · ")} />
        <Kpi icon={UserPlus} label="Contratações (12 meses)" value={hires12} />
        <Kpi icon={UserMinus} label="Desligamentos (12 meses)" value={terms12} />
        <Kpi icon={TrendingDown} label="Rotatividade (12 meses)" value={`${turnover}%`} meta="(admissões + desligamentos) ÷ 2 ÷ quadro" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Admissões e desligamentos por mês" icon={Activity}>
          <Columns
            data={movement}
            series={[
              { name: "Admissões", color: "var(--navy-600)" },
              { name: "Desligamentos", color: "#c9a300" },
            ]}
          />
        </Panel>
        <Panel title="Funcionários por departamento" icon={Building2}>
          <HBars data={depts.map((d) => ({ label: d.label, value: d.value, href: `/rh/funcionarios?dep=${d.id}` }))} />
        </Panel>
      </div>

      <div className="kpis">
        <Kpi icon={Briefcase} label="Vagas abertas" value={openVac} href="/rh/recrutamento/vagas" />
        <Kpi icon={GitBranch} label="Candidaturas recebidas" value={totalApps} meta="Desde o início do sistema" />
        <Kpi icon={UserPlus} label="Conversão em contratação" value={totalApps ? `${((hiredTotal / totalApps) * 100).toFixed(1).replace(".", ",")}%` : "—"} meta={`${hiredTotal} contratados`} />
        <Kpi icon={Timer} label="Tempo até contratar" value={timeToHire != null ? `${timeToHire} dias` : "—"} meta="Média da candidatura à contratação" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Candidatos por etapa" icon={GitBranch}>
          <Funnel data={pipeline.map((p) => ({ label: p.label, value: p.value }))} />
        </Panel>
        <Panel title="Tempo de casa" icon={Hourglass}>
          <HBars data={buckets} color="var(--navy-400)" />
        </Panel>
      </div>

      <div className="grid grid-2">
        <Panel title="Férias (últimos 12 meses e programadas)" icon={Palmtree}>
          <Donut
            data={[
              { label: `Aprovadas · ${vacDays("APROVADO")} dias`, value: vacN("APROVADO"), color: "var(--navy-600)" },
              { label: "Pendentes", value: vacN("PENDENTE"), color: "#c9a300" },
              { label: "Recusadas", value: vacN("RECUSADO"), color: "var(--danger)" },
              { label: "Canceladas", value: vacN("CANCELADO"), color: "var(--steel-300)" },
            ]}
            center={
              <span>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--navy-900)", display: "block", lineHeight: 1 }}>{vac.reduce((a, v) => a + v.n, 0)}</strong>
                <span className="xsmall subtle">pedidos</span>
              </span>
            }
          />
          <p className="small muted" style={{ marginTop: 14 }}>
            {noBalance} {noBalance === 1 ? "pessoa tem" : "pessoas têm"} 30 dias ou mais de saldo acumulado.
          </p>
        </Panel>
        <Panel title="Solicitações por tipo" icon={Inbox}>
          <HBars data={reqTypes.sort((a, b) => b.n - a.n).map((r) => ({ label: REQUEST_TYPE_LABEL[r.type], value: r.n }))} color="var(--navy-500)" />
          <p className="small muted" style={{ marginTop: 14 }}>
            {reqOpen} em aberto{responseHours != null ? ` · tempo médio de resposta: ${responseHours < 48 ? `${responseHours} h` : `${Math.round(responseHours / 24)} dias`}` : ""}.
          </p>
        </Panel>
      </div>
    </>
  );
}
