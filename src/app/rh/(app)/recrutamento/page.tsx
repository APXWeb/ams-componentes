import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gte, inArray, or } from "drizzle-orm";
import { Briefcase, ExternalLink, Plus, GitBranch, CalendarClock, UserCheck, Inbox } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { vacanciesScope } from "@/lib/rh-scope";
import { PageHeader, Kpi } from "@/components/rh/ui";
import { Kanban, type KCard } from "@/components/rh/kanban";
import { EMPLOYMENT_LABEL } from "@/lib/labels";
import { isoDaysAgo, relative } from "@/lib/format";

export const metadata: Metadata = { title: "Recrutamento" };

export default async function RecrutamentoPage({ searchParams }: PageProps<"/rh/recrutamento">) {
  const user = await requireUser("recruitment.view");
  const editable = can(user.role, "recruitment.manage");
  const sp = await searchParams;
  const scope = vacanciesScope(user);

  const vacancies = db
    .select({
      id: schema.vacancies.id,
      title: schema.vacancies.title,
      status: schema.vacancies.status,
      department: schema.departments.name,
      type: schema.vacancies.employmentType,
      publishedAt: schema.vacancies.publishedAt,
      slug: schema.vacancies.slug,
      openings: schema.vacancies.openings,
    })
    .from(schema.vacancies)
    .innerJoin(schema.departments, eq(schema.departments.id, schema.vacancies.departmentId))
    .where(and(eq(schema.vacancies.status, "ABERTA"), scope))
    .orderBy(desc(schema.vacancies.publishedAt))
    .all();
  const vagaId = Number(sp.vaga) || 0;
  const selected = vagaId ? db.select().from(schema.vacancies).where(and(eq(schema.vacancies.id, vagaId), scope)).get() : undefined;

  const recentHire = isoDaysAgo(90);
  const cards: KCard[] = db
    .select({
      id: schema.applications.id,
      name: schema.candidates.name,
      city: schema.candidates.city,
      stage: schema.applications.stage,
      rating: schema.applications.rating,
      vacancy: schema.vacancies.title,
      interviewAt: schema.applications.interviewAt,
      lastActivityAt: schema.applications.lastActivityAt,
      createdAt: schema.applications.createdAt,
    })
    .from(schema.applications)
    .innerJoin(schema.candidates, eq(schema.candidates.id, schema.applications.candidateId))
    .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
    .where(
      and(
        scope,
        selected ? eq(schema.vacancies.id, selected.id) : undefined,
        or(eq(schema.applications.outcome, "EM_ANDAMENTO"), and(eq(schema.applications.outcome, "CONTRATADO"), gte(schema.applications.lastActivityAt, recentHire))),
      ),
    )
    .orderBy(desc(schema.applications.lastActivityAt))
    .all();

  const counts = db
    .select({ vacancyId: schema.applications.vacancyId, n: count() })
    .from(schema.applications)
    .where(and(eq(schema.applications.outcome, "EM_ANDAMENTO"), inArray(schema.applications.vacancyId, vacancies.map((v) => v.id).concat(0))))
    .groupBy(schema.applications.vacancyId)
    .all();
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
        <Kpi icon={GitBranch} label="Em processo" value={active.length} meta={`${vacancies.length} ${vacancies.length === 1 ? "vaga aberta" : "vagas abertas"}`} />
        <Kpi icon={CalendarClock} label="Entrevistas agendadas" value={interviews} />
        <Kpi icon={UserCheck} label="Aprovados para contratar" value={approved} />
      </div>

      <nav className="seg" aria-label="Escolher vaga" style={{ marginBottom: 14, maxWidth: "100%", overflowX: "auto" }}>
        <Link href="/rh/recrutamento" aria-current={!selected ? "page" : undefined} scroll={false}>
          Todas as vagas
        </Link>
        {vacancies.map((v) => (
          <Link key={v.id} href={`/rh/recrutamento?vaga=${v.id}`} aria-current={selected?.id === v.id ? "page" : undefined} scroll={false}>
            {v.title} <span className="mono subtle">{counts.find((c) => c.vacancyId === v.id)?.n ?? 0}</span>
          </Link>
        ))}
      </nav>

      {selected ? (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel__body row wrap between" style={{ padding: "12px 16px" }}>
            <span className="small muted">
              {EMPLOYMENT_LABEL[selected.employmentType]} · {selected.location} · {selected.openings} {selected.openings === 1 ? "posição" : "posições"} · publicada {relative(selected.publishedAt)}
            </span>
            <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
              {selected.status === "ABERTA" ? (
                <a className="btn btn--ghost btn--sm" href={`/trabalhe-conosco/${selected.slug}`} target="_blank" rel="noopener">
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
