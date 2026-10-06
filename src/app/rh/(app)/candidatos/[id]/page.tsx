import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { CalendarClock, CheckCircle2, FileText, History, Mail, MapPin, MessageSquare, Phone, ShieldCheck, UserCheck, UserX, ArrowRightLeft, Eye, Download, RotateCcw, Briefcase } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { STAGES } from "@/db/schema";
import { PageHeader, Stars } from "@/components/rh/ui";
import { Badge, Panel } from "@/components/ui/bits";
import { ActionForm, ActionModal } from "@/components/ui/modal";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { RatingInput } from "@/components/rh/rating-input";
import { OUTCOME_LABEL, STAGE_LABEL, EMPLOYMENT_LABEL } from "@/lib/labels";
import { fmtDate, fmtDateTime, relative, todayISO, slugify } from "@/lib/format";
import { activeEmployeeOptions, positionOptions } from "@/lib/rh-options";
import { closeApplication, evaluateApplication, hireCandidate, moveApplicationForm, reopenApplication, scheduleInterview } from "../../recrutamento/actions";

export const metadata: Metadata = { title: "Candidato" };

const EVENT_LABEL = { CRIADA: "Candidatura recebida", ETAPA: "Mudança de etapa", NOTA: "Observação", AVALIACAO: "Avaliação", ENTREVISTA: "Entrevista", CONTRATACAO: "Contratação", ENCERRAMENTO: "Processo encerrado" } as const;

export default async function CandidatoPage({ params }: PageProps<"/rh/candidatos/[id]">) {
  const user = await requireUser("recruitment.view");
  const id = Number((await params).id);
  const row = Number.isInteger(id)
    ? db
        .select({ app: schema.applications, cand: schema.candidates, vacancy: schema.vacancies, department: schema.departments.name })
        .from(schema.applications)
        .innerJoin(schema.candidates, eq(schema.candidates.id, schema.applications.candidateId))
        .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
        .innerJoin(schema.departments, eq(schema.departments.id, schema.vacancies.departmentId))
        .where(eq(schema.applications.id, id))
        .get()
    : undefined;
  if (!row) notFound();
  const editable = can(user.role, "recruitment.manage");
  // gestor só acessa candidatos de vagas do próprio departamento
  if (!editable && row.vacancy.departmentId !== user.departmentId) notFound();

  const { app, cand, vacancy } = row;
  const events = db
    .select({ e: schema.applicationEvents, actor: schema.users.name })
    .from(schema.applicationEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.applicationEvents.actorUserId))
    .where(eq(schema.applicationEvents.applicationId, app.id))
    .orderBy(desc(schema.applicationEvents.createdAt), desc(schema.applicationEvents.id))
    .all();
  const resume = db.select().from(schema.documents).where(and(eq(schema.documents.applicationId, app.id), eq(schema.documents.category, "CURRICULO"))).get();
  const others = db
    .select({ id: schema.applications.id, title: schema.vacancies.title, stage: schema.applications.stage, outcome: schema.applications.outcome, at: schema.applications.createdAt })
    .from(schema.applications)
    .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
    .where(and(eq(schema.applications.candidateId, cand.id), ne(schema.applications.id, app.id)))
    .all();
  const last = events[0];
  const active = app.outcome === "EM_ANDAMENTO";
  const stageIdx = STAGES.indexOf(app.stage);
  const canHire = editable && can(user.role, "employees.manage") && active && app.stage === "APROVADO";
  const suggestedEmail = `${slugify(cand.name).replace(/-/g, ".")}@ams.example`;

  const lastText = last
    ? last.e.type === "ETAPA"
      ? `${STAGE_LABEL[last.e.fromStage!]} → ${STAGE_LABEL[last.e.toStage!]}`
      : EVENT_LABEL[last.e.type]
    : "—";

  return (
    <>
      <PageHeader
        back={{ href: `/rh/recrutamento?vaga=${vacancy.id}`, label: `Recrutamento · ${vacancy.title}` }}
        title={
          <span className="row wrap" style={{ "--gap": "12px" } as React.CSSProperties}>
            {cand.name}
            {active ? <Badge tone="info">{STAGE_LABEL[app.stage]}</Badge> : <Badge status={app.outcome}>{OUTCOME_LABEL[app.outcome]}</Badge>}
          </span>
        }
        description={
          <>
            Candidatura para <strong>{vacancy.title}</strong> ({row.department}) em {fmtDate(app.createdAt)} · Última ação: <strong>{lastText}</strong> {last ? relative(last.e.createdAt) : ""}
            {last?.actor ? ` por ${last.actor}` : ""}
          </>
        }
        actions={
          editable ? (
            <>
              {app.outcome === "CONTRATADO" && app.hiredEmployeeId ? (
                <Link href={`/rh/funcionarios/${app.hiredEmployeeId}`} className="btn">
                  <UserCheck aria-hidden /> Ver funcionário
                </Link>
              ) : null}
              {!active && app.outcome !== "CONTRATADO" ? (
                <ActionModal trigger={<><RotateCcw aria-hidden /> Reabrir processo</>} triggerClass="btn btn--outline" title="Reabrir processo" description="O candidato volta ao quadro na mesma etapa." action={reopenApplication} submitLabel="Reabrir" hidden={{ id: app.id }} />
              ) : null}
              {active ? (
                <ActionModal
                  trigger={
                    <>
                      <UserX aria-hidden /> Encerrar
                    </>
                  }
                  triggerClass="btn btn--danger-outline"
                  title="Encerrar processo"
                  description="O candidato sai do quadro ativo. O registro e o histórico são mantidos."
                  action={closeApplication}
                  submitLabel="Encerrar processo"
                  submitClass="btn btn--danger"
                  hidden={{ id: app.id }}
                >
                  <SelectField
                    label="Motivo"
                    name="outcome"
                    defaultValue="REPROVADO"
                    options={[
                      { value: "REPROVADO", label: "Não selecionado" },
                      { value: "DESISTIU", label: "Candidato desistiu" },
                    ]}
                  />
                  <TextAreaField label="Justificativa" name="note" rows={3} placeholder="Registre o motivo para consultas futuras." />
                </ActionModal>
              ) : null}
              {canHire ? (
                <ActionModal
                  trigger={
                    <>
                      <UserCheck aria-hidden /> Contratar candidato
                    </>
                  }
                  triggerClass="btn btn--signal"
                  title={`Contratar ${cand.name}`}
                  description="Será criado o cadastro de funcionário com os dados já informados pelo candidato. O currículo vai para os documentos e o processo sai do quadro ativo."
                  action={hireCandidate}
                  submitLabel="Confirmar contratação"
                  hidden={{ id: app.id }}
                  wide
                >
                  <div className="notice">
                    <CheckCircle2 aria-hidden />
                    <span>
                      Dados aproveitados: <strong>{cand.name}</strong>, {cand.email}, {cand.phone}, {cand.city}.
                    </span>
                  </div>
                  <div className="grid grid-2">
                    <div className="field">
                      <label className="label" htmlFor="positionId">
                        Cargo
                      </label>
                      <select id="positionId" name="positionId" className="select" defaultValue={vacancy.positionId ?? ""}>
                        <option value="">Selecione</option>
                        {positionOptions().map((g) => (
                          <optgroup key={g.department} label={g.department}>
                            {g.items.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <SelectField label="Gestor direto" name="managerId" optional placeholder="Definir depois" options={activeEmployeeOptions()} defaultValue="" />
                    <TextField label="E-mail corporativo" name="corporateEmail" type="email" defaultValue={suggestedEmail} />
                    <TextField label="Data de admissão" name="hiredAt" type="date" defaultValue={todayISO()} />
                    <SelectField
                      label="Contratação"
                      name="employmentType"
                      defaultValue={vacancy.employmentType}
                      options={Object.entries(EMPLOYMENT_LABEL).map(([value, label]) => ({ value, label }))}
                    />
                  </div>
                  <label className="check">
                    <input type="checkbox" name="closeVacancy" defaultChecked={vacancy.openings <= 1} /> Encerrar a vaga {vacancy.title} e retirá-la do site
                  </label>
                </ActionModal>
              ) : null}
            </>
          ) : null
        }
      />

      <ol className="row wrap" aria-label="Etapas do processo" style={{ listStyle: "none", padding: 0, margin: "0 0 18px", "--gap": "6px" } as React.CSSProperties}>
        {STAGES.map((s, i) => {
          const done = i < stageIdx || app.outcome === "CONTRATADO";
          const current = i === stageIdx && active;
          return (
            <li key={s} aria-current={current ? "step" : undefined} className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
              <span
                className="badge badge--plain"
                style={{
                  background: current ? "var(--navy-700)" : done ? "var(--navy-100)" : "var(--steel-100)",
                  color: current ? "var(--signal)" : done ? "var(--navy-700)" : "var(--steel-500)",
                  height: 26,
                }}
              >
                {String(i + 1).padStart(2, "0")} {STAGE_LABEL[s]}
              </span>
              {i < STAGES.length - 1 ? <span aria-hidden style={{ width: 14, height: 1, background: "var(--steel-300)" }} /> : null}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-main">
        <div className="grid" style={{ alignContent: "start" }}>
          <Panel
            title="Currículo"
            icon={FileText}
            bodyClass=""
            action={
              resume?.storageKey ? (
                <span className="row" style={{ "--gap": "4px" } as React.CSSProperties}>
                  <a className="btn btn--ghost btn--sm" href={`/rh/arquivos/${resume.id}`} target="_blank" rel="noopener">
                    <Eye aria-hidden /> Abrir
                  </a>
                  <a className="btn btn--ghost btn--sm" href={`/rh/arquivos/${resume.id}?baixar=1`}>
                    <Download aria-hidden /> Baixar
                  </a>
                </span>
              ) : undefined
            }
          >
            {resume?.storageKey && resume.mimeType === "application/pdf" ? (
              <iframe src={`/rh/arquivos/${resume.id}#view=FitH&toolbar=0`} title={`Currículo de ${cand.name}`} style={{ width: "100%", height: 520, border: 0, display: "block", background: "var(--steel-50)" }} />
            ) : resume?.storageKey ? (
              <p className="panel__body small muted">Arquivo DOCX: use Baixar para abrir.</p>
            ) : (
              <p className="panel__body small muted">Nenhum currículo anexado.</p>
            )}
          </Panel>

          <Panel title="Histórico do processo" icon={History}>
            <ol className="timeline">
              {events.map(({ e, actor }) => (
                <li key={e.id} className={e.type === "CONTRATACAO" || e.type === "CRIADA" ? "is-key" : ""}>
                  <div className="timeline__title">
                    {e.type === "ETAPA" ? `${STAGE_LABEL[e.fromStage!]} → ${STAGE_LABEL[e.toStage!]}` : EVENT_LABEL[e.type]}
                  </div>
                  <div className="timeline__meta">
                    {fmtDateTime(e.createdAt)}
                    {actor ? ` · ${actor}` : e.type === "CRIADA" ? " · site" : ""}
                  </div>
                  {e.note ? <div className="timeline__note">{e.note}</div> : null}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="grid" style={{ alignContent: "start" }}>
          <Panel title="Quem é" icon={Briefcase}>
            <dl className="dl">
              <dt>
                <Mail size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} /> E-mail
              </dt>
              <dd>
                <a className="link" href={`mailto:${cand.email}`}>
                  {cand.email}
                </a>
              </dd>
              <dt>
                <Phone size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} /> Telefone
              </dt>
              <dd>
                <a className="link" href={`tel:+55${cand.phone.replace(/\D/g, "")}`}>
                  {cand.phone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")}
                </a>
              </dd>
              <dt>
                <MapPin size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} /> Cidade
              </dt>
              <dd>{cand.city}</dd>
              <dt>Candidatura</dt>
              <dd>{fmtDateTime(app.createdAt)}</dd>
              <dt>Avaliação</dt>
              <dd>
                <Stars value={app.rating} />
              </dd>
              {app.interviewAt ? (
                <>
                  <dt>Entrevista</dt>
                  <dd>{fmtDateTime(app.interviewAt)}</dd>
                </>
              ) : null}
            </dl>
            {app.message ? (
              <blockquote className="timeline__note" style={{ margin: "14px 0 0" }}>
                <MessageSquare size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
                {app.message}
              </blockquote>
            ) : null}
          </Panel>

          {editable && active ? (
            <Panel title="Mover etapa" icon={ArrowRightLeft}>
              <ActionForm action={moveApplicationForm} hidden={{ id: app.id }} className="stack">
                <SelectField
                  label="Nova etapa"
                  name="stage"
                  defaultValue={STAGES[Math.min(stageIdx + 1, 4)]}
                  options={STAGES.filter((s) => s !== "CONTRATADO").map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
                  hint={app.stage === "APROVADO" ? "Para concluir, use Contratar candidato." : undefined}
                />
                <TextAreaField label="Comentário" name="note" optional rows={2} />
                <SubmitButton className="btn btn--block">Mover candidato</SubmitButton>
              </ActionForm>
            </Panel>
          ) : null}

          {editable && active ? (
            <Panel title="Entrevista" icon={CalendarClock}>
              <ActionForm action={scheduleInterview} hidden={{ id: app.id }} className="stack">
                <TextField label="Data e hora" name="when" type="datetime-local" defaultValue={app.interviewAt ? new Date(app.interviewAt).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 16).replace(" ", "T") : ""} />
                <TextField label="Local ou link" name="note" optional placeholder="Ex.: sala de reuniões, matriz" />
                <SubmitButton className="btn btn--outline btn--block">{app.interviewAt ? "Remarcar entrevista" : "Agendar entrevista"}</SubmitButton>
              </ActionForm>
            </Panel>
          ) : null}

          {editable ? (
            <Panel title="Avaliação e observações" icon={CheckCircle2}>
              <ActionForm action={evaluateApplication} hidden={{ id: app.id }} className="stack">
                <RatingInput name="rating" defaultValue={app.rating} />
                <TextAreaField label="Observações internas" name="notes" optional rows={4} defaultValue={app.notes ?? ""} hint="Visível apenas para o RH e gestores da área." />
                <TextAreaField label="Registrar comentário no histórico" name="comment" optional rows={2} />
                <SubmitButton className="btn btn--outline btn--block">Salvar avaliação</SubmitButton>
              </ActionForm>
            </Panel>
          ) : app.notes ? (
            <Panel title="Observações do RH" icon={CheckCircle2}>
              <p className="small pre-line">{app.notes}</p>
            </Panel>
          ) : null}

          {others.length ? (
            <Panel title="Outras candidaturas" icon={Briefcase} bodyClass="">
              <ul className="list">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link href={`/rh/candidatos/${o.id}`} className="list-item">
                      <span className="list-item__main">
                        <span className="list-item__title">{o.title}</span>
                        <span className="list-item__sub">{fmtDate(o.at)}</span>
                      </span>
                      <Badge status={o.outcome}>{o.outcome === "EM_ANDAMENTO" ? STAGE_LABEL[o.stage] : OUTCOME_LABEL[o.outcome]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <p className="xsmall subtle row" style={{ "--gap": "6px", alignItems: "flex-start" } as React.CSSProperties}>
            <ShieldCheck size={14} aria-hidden style={{ flex: "none", marginTop: 2 }} />
            Consentimento LGPD em {fmtDate(cand.consentAt)} (versão {cand.consentVersion}). Dados retidos até {fmtDate(cand.retainUntil)}.
          </p>
        </div>
      </div>
    </>
  );
}
