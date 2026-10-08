"use client";

import { Activity, Building2, GitBranch, Inbox, Palmtree, TrendingDown, UserMinus, UserPlus, Users, Briefcase, Timer, Hourglass } from "lucide-react";
import { PageHeader, Kpi, HBars, Funnel, Columns, Donut } from "@/components/rh/ui";
import { Panel } from "@/components/ui/bits";
import { Guard, useRh } from "@/components/rh/demo-app";
import { activeEmployees, activeEmployeesCount, departmentDistribution, movementByMonth, openVacanciesCount, pipelineCounts } from "@/lib/demo/queries";
import { EMPLOYMENT_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { REQUEST_TYPES, EMPLOYMENT_TYPES } from "@/lib/demo/types";
import { addDays, daysBetween, todayISO } from "@/lib/format";

export function IndicadoresView() {
  return (
    <Guard anyOf={["indicators.view"]}>
      <Indicadores />
    </Guard>
  );
}

function Indicadores() {
  const { d, user } = useRh();
  const today = todayISO();
  const yearAgo = addDays(today, -365);

  const headcount = activeEmployeesCount(d);
  const movement = movementByMonth(d, 12);
  const hires12 = movement.reduce((a, m) => a + m.values[0], 0);
  const terms12 = movement.reduce((a, m) => a + m.values[1], 0);
  const turnover = headcount ? (((hires12 + terms12) / 2 / headcount) * 100).toFixed(1).replace(".", ",") : "0";
  const depts = departmentDistribution(d);
  const pipeline = pipelineCounts(d, user);
  const openVac = openVacanciesCount(d);

  // tempo médio entre a candidatura e a contratação
  const hired = d.applications
    .map((a) => ({ a, e: d.applicationEvents.find((x) => x.applicationId === a.id && x.type === "CONTRATACAO") }))
    .filter((x) => x.e);
  const timeToHire = hired.length ? Math.round(hired.reduce((s, h) => s + daysBetween(h.a.createdAt.slice(0, 10), h.e!.createdAt.slice(0, 10)), 0) / hired.length) : null;
  const totalApps = d.applications.length;
  const hiredTotal = d.applications.filter((a) => a.outcome === "CONTRATADO").length;

  const vac = d.vacations.filter((v) => v.startDate >= yearAgo);
  const vacN = (s: string) => vac.filter((v) => v.status === s).length;
  const vacDays = (s: string) => vac.filter((v) => v.status === s).reduce((a, v) => a + v.days, 0);
  const fullBalance = activeEmployees(d).filter((e) => e.vacationBalance >= 30).length;

  const reqTypes = REQUEST_TYPES.map((t) => ({ label: REQUEST_TYPE_LABEL[t], value: d.requests.filter((r) => r.type === t).length })).sort((a, b) => b.value - a.value);
  const reqOpen = d.requests.filter((r) => r.status === "PENDENTE" || r.status === "EM_ANALISE").length;
  const answered = d.requests.filter((r) => r.respondedAt);
  const responseHours = answered.length ? Math.round(answered.reduce((a, x) => a + (Date.parse(x.respondedAt!) - Date.parse(x.createdAt)) / 3600000, 0) / answered.length) : null;

  const tenures = activeEmployees(d);
  const buckets = [
    { label: "Até 1 ano", max: 1 },
    { label: "1 a 3 anos", max: 3 },
    { label: "3 a 5 anos", max: 5 },
    { label: "5 a 10 anos", max: 10 },
    { label: "Mais de 10 anos", max: 999 },
  ].map((b, i, arr) => ({
    label: b.label,
    value: tenures.filter((t) => {
      const y = daysBetween(t.hiredAt, today) / 365;
      return y < b.max && y >= (i ? arr[i - 1].max : 0);
    }).length,
  }));
  const types = EMPLOYMENT_TYPES.map((t) => ({ t, n: tenures.filter((e) => e.employmentType === t).length })).filter((x) => x.n);

  return (
    <>
      <PageHeader eyebrow="Visão geral" title="Indicadores" description="Quadro de pessoal, recrutamento, férias e atendimento do RH nos últimos 12 meses." />

      <div className="kpis">
        <Kpi icon={Users} label="Quadro ativo" value={headcount} meta={types.map((t) => `${t.n} ${t.t === "CLT" ? "CLT" : EMPLOYMENT_LABEL[t.t].toLowerCase()}`).join(" · ")} href="/rh/funcionarios" />
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
          <HBars data={depts.map((x) => ({ label: x.label, value: x.value, href: `/rh/funcionarios?dep=${x.id}` }))} />
        </Panel>
      </div>

      <div className="kpis">
        <Kpi icon={Briefcase} label="Vagas abertas" value={openVac} href="/rh/recrutamento/vagas" />
        <Kpi icon={GitBranch} label="Candidaturas recebidas" value={totalApps} meta="Últimos 90 dias" href="/rh/recrutamento" />
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
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--navy-900)", display: "block", lineHeight: 1 }}>{vac.length}</strong>
                <span className="xsmall subtle">pedidos</span>
              </span>
            }
          />
          <p className="small muted" style={{ marginTop: 14 }}>
            {fullBalance} {fullBalance === 1 ? "pessoa tem" : "pessoas têm"} 30 dias ou mais de saldo acumulado.
          </p>
        </Panel>
        <Panel title="Solicitações por tipo" icon={Inbox}>
          <HBars data={reqTypes} color="var(--navy-500)" />
          <p className="small muted" style={{ marginTop: 14 }}>
            {reqOpen} em aberto{responseHours != null ? ` · tempo médio de resposta: ${responseHours < 48 ? `${responseHours} h` : `${Math.round(responseHours / 24)} dias`}` : ""}.
          </p>
        </Panel>
      </div>
    </>
  );
}
