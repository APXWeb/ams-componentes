"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Briefcase, ExternalLink, Plus, GitBranch, CalendarClock, UserCheck, Inbox } from "lucide-react";
import { can } from "@/lib/permissions";
import { asset } from "@/lib/asset";
import { PageHeader, Kpi } from "@/components/rh/ui";
import { Kanban, type KCard } from "@/components/rh/kanban";
import { Guard, useRh } from "@/components/rh/demo-app";
import { candidate, dept, vacanciesScope, vacancy } from "@/lib/demo/queries";
import { EMPLOYMENT_LABEL } from "@/lib/labels";
import { isoDaysAgo, relative } from "@/lib/format";

export function RecrutamentoView() {
  return (
    <Guard anyOf={["recruitment.view"]}>
      <Quadro />
    </Guard>
  );
}

function Quadro() {
  const { d, user } = useRh();
  const editable = can(user.role, "recruitment.manage");
  const scope = vacanciesScope(user);
  const vagaId = Number(useSearchParams().get("vaga")) || 0;

  const vacancies = d.vacancies.filter((v) => v.status === "ABERTA" && scope(v)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  const selected = vagaId ? d.vacancies.find((v) => v.id === vagaId && scope(v)) : undefined;
  const recentHire = isoDaysAgo(90);
  const cards: KCard[] = d.applications
    .filter((a) => scope(vacancy(d, a.vacancyId)!) && (!selected || a.vacancyId === selected.id) && (a.outcome === "EM_ANDAMENTO" || (a.outcome === "CONTRATADO" && a.lastActivityAt >= recentHire)))
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
    .map((a) => {
      const c = candidate(d, a.candidateId)!;
      return { id: a.id, name: c.name, city: c.city, stage: a.stage, rating: a.rating, vacancy: vacancy(d, a.vacancyId)!.title, interviewAt: a.interviewAt, lastActivityAt: a.lastActivityAt, createdAt: a.createdAt };
    });
  const count = (vid: number) => d.applications.filter((a) => a.vacancyId === vid && a.outcome === "EM_ANDAMENTO").length;
  const active = cards.filter((c) => c.stage !== "CONTRATADO");
  const interviews = active.filter((c) => c.interviewAt && c.interviewAt > new Date().toISOString()).length;
  const fresh = active.filter((c) => c.stage === "CANDIDATO").length;
  const approved = active.filter((c) => c.stage === "APROVADO").length;

  return (
    <>
      <PageHeader
        eyebrow="Pessoas"
        title="Recrutamento"
        description={selected ? `Pipeline da vaga ${selected.title}.` : "Pipeline de todas as vagas abertas. Candidaturas do site entram automaticamente na primeira coluna."}
        actions={
          <>
            <Link href="/rh/recrutamento/vagas" className="btn btn--outline">
              <Briefcase aria-hidden /> Vagas
            </Link>
            {editable ? (
              <Link href="/rh/recrutamento/vagas/nova" className="btn">
                <Plus aria-hidden /> Nova vaga
              </Link>
            ) : null}
          </>
        }
      />

      <div className="kpis">
        <Kpi icon={Inbox} label="Novas candidaturas" value={fresh} meta="Aguardando triagem" alert={fresh > 0 && editable} />
        <Kpi icon={GitBranch} label="Em processo" value={active.length} meta={selected ? selected.title : `${vacancies.length} ${vacancies.length === 1 ? "vaga aberta" : "vagas abertas"}`} />
        <Kpi icon={CalendarClock} label="Entrevistas agendadas" value={interviews} />
        <Kpi icon={UserCheck} label="Aprovados para contratar" value={approved} />
      </div>

      <nav className="seg seg--scroll" aria-label="Escolher vaga" style={{ marginBottom: 14 }}>
        <Link href="/rh/recrutamento" aria-current={!selected ? "page" : undefined} scroll={false}>
          Todas as vagas
        </Link>
        {vacancies.map((v) => (
          <Link key={v.id} href={`/rh/recrutamento?vaga=${v.id}`} aria-current={selected?.id === v.id ? "page" : undefined} scroll={false}>
            {v.title} <span className="mono subtle">{count(v.id)}</span>
          </Link>
        ))}
      </nav>

      {selected ? (
        <div className="panel tab-panel" style={{ marginBottom: 14 }} key={selected.id}>
          <div className="panel__body row wrap between" style={{ padding: "12px 16px" }}>
            <span className="small muted">
              {dept(d, selected.departmentId)?.name} · {EMPLOYMENT_LABEL[selected.employmentType]} · {selected.location} · {selected.openings} {selected.openings === 1 ? "posição" : "posições"} · publicada {relative(selected.publishedAt)}
            </span>
            <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
              {selected.status === "ABERTA" ? (
                <a className="btn btn--ghost btn--sm" href={`${asset("/trabalhe-conosco/")}${selected.slug}`} target="_blank" rel="noopener">
                  <ExternalLink aria-hidden /> Ver no site
                </a>
              ) : null}
              {editable ? (
                <Link className="btn btn--outline btn--sm" href={`/rh/recrutamento/vagas/${selected.id}`}>
                  Editar vaga
                </Link>
              ) : null}
            </span>
          </div>
        </div>
      ) : null}

      <Kanban key={selected?.id ?? "all"} cards={cards} editable={editable} showVacancy={!selected} />
      <p className="xsmall subtle" style={{ marginTop: 8 }}>
        A coluna Contratado mostra as admissões dos últimos 90 dias. Candidatos não selecionados ficam no histórico de cada vaga.
      </p>
    </>
  );
}
