"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, FileText, History, Mail, MapPin, MessageSquare, Phone, ShieldCheck, UserCheck, UserX, ArrowRightLeft, RotateCcw, Briefcase, GraduationCap, Timer } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageHeader, Stars } from "@/components/rh/ui";
import { Avatar, Badge, Panel } from "@/components/ui/bits";
import { ActionForm, ActionModal } from "@/components/ui/modal";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { LinkedinIcon } from "@/components/ui/brand-icons";
import { RatingInput } from "@/components/rh/rating-input";
import { DocumentPreview, DocumentStage } from "@/components/rh/document-viewer";
import { Guard, NotFoundState, useRh } from "@/components/rh/demo-app";
import { activeEmployeeOptions, candidate, dept, positionOptions, userById, vacancy } from "@/lib/demo/queries";
import { closeApplication, evaluateApplication, hireCandidate, moveApplicationForm, reopenApplication, scheduleInterview } from "@/lib/demo/actions/recruitment";
import { STAGES } from "@/lib/demo/types";
import { OUTCOME_LABEL, STAGE_LABEL, EMPLOYMENT_LABEL } from "@/lib/labels";
import { daysBetween, fmtDate, fmtDateTime, relative, todayISO, slugify } from "@/lib/format";

const EVENT_LABEL = { CRIADA: "Candidatura recebida", ETAPA: "Mudança de etapa", NOTA: "Observação", AVALIACAO: "Avaliação", ENTREVISTA: "Entrevista", CONTRATACAO: "Contratação", ENCERRAMENTO: "Processo encerrado" } as const;

export function CandidatoView({ id }: { id: number }) {
  return (
    <Guard anyOf={["recruitment.view"]}>
      <Candidato id={id} />
    </Guard>
  );
}

function Candidato({ id }: { id: number }) {
  const { d, user } = useRh();
  const app = d.applications.find((a) => a.id === id);
  const vac = app ? vacancy(d, app.vacancyId) : undefined;
  const editable = can(user.role, "recruitment.manage");
  // gestor só acessa candidatos de vagas do próprio departamento
  if (!app || !vac || (!editable && vac.departmentId !== user.departmentId)) return <NotFoundState what="Candidato" />;
  const cand = candidate(d, app.candidateId)!;

  const events = d.applicationEvents.filter((e) => e.applicationId === app.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  const resume = d.documents.find((x) => x.applicationId === app.id && x.category === "CURRICULO");
  const others = d.applications.filter((a) => a.candidateId === cand.id && a.id !== app.id);
  const last = events[0];
  const active = app.outcome === "EM_ANDAMENTO";
  const stageIdx = STAGES.indexOf(app.stage);
  const canHire = editable && can(user.role, "employees.manage") && active && app.stage === "APROVADO";
  const suggestedEmail = `${slugify(cand.name).replace(/-/g, ".")}@ams.example`;
  const daysInProcess = Math.max(0, daysBetween(app.createdAt.slice(0, 10), todayISO()));
  const lastText = last ? (last.type === "ETAPA" ? `${STAGE_LABEL[last.fromStage!]} → ${STAGE_LABEL[last.toStage!]}` : EVENT_LABEL[last.type]) : "—";
  const lastActor = last?.actorUserId ? userById(d, last.actorUserId)?.name : null;

  return (
    <>
      <PageHeader
        back={{ href: `/rh/recrutamento?vaga=${vac.id}`, label: `Recrutamento · ${vac.title}` }}
        title={
          <span className="profile-head">
            <Avatar name={cand.name} size="lg" />
            <span>
              <span className="row wrap" style={{ "--gap": "12px" } as React.CSSProperties}>
                {cand.name}
                {active ? <Badge tone="info">{STAGE_LABEL[app.stage]}</Badge> : <Badge status={app.outcome}>{OUTCOME_LABEL[app.outcome]}</Badge>}
              </span>
              <span className="meta-row" style={{ fontFamily: "var(--font-body)", fontWeight: 400, letterSpacing: 0 }}>
                <span>
                  <Briefcase aria-hidden /> {vac.title}
                </span>
                <span>
                  <MapPin aria-hidden /> {cand.city}
                </span>
                <span>
                  <Timer aria-hidden /> {daysInProcess === 0 ? "Candidatou-se hoje" : `${daysInProcess} ${daysInProcess === 1 ? "dia" : "dias"} no processo`}
                </span>
              </span>
            </span>
          </span>
        }
        description={
          <>
            Última ação: <strong>{lastText}</strong> {last ? relative(last.createdAt) : ""}
            {lastActor ? ` por ${lastActor}` : ""}
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
                      <select id="positionId" name="positionId" className="select" defaultValue={vac.positionId ?? ""}>
                        <option value="">Selecione</option>
                        {positionOptions(d).map((g) => (
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
                    <SelectField label="Gestor direto" name="managerId" optional placeholder="Definir depois" options={activeEmployeeOptions(d)} defaultValue={d.employees.find((e) => e.departmentId === vac.departmentId && e.managerId === null)?.id ?? ""} />
                    <TextField label="E-mail corporativo" name="corporateEmail" type="email" defaultValue={suggestedEmail} />
                    <TextField label="Data de admissão" name="hiredAt" type="date" defaultValue={todayISO()} />
                    <SelectField label="Contratação" name="employmentType" defaultValue={vac.employmentType} options={Object.entries(EMPLOYMENT_LABEL).map(([value, label]) => ({ value, label }))} />
                  </div>
                  <label className="check">
                    <input type="checkbox" name="closeVacancy" defaultChecked={vac.openings <= 1} /> Encerrar a vaga {vac.title} e retirá-la do site
                  </label>
                </ActionModal>
              ) : null}
            </>
          ) : null
        }
      />

      <ol className="stepper" aria-label="Etapas do processo">
        {STAGES.map((s, i) => {
          const done = i < stageIdx || app.outcome === "CONTRATADO";
          const current = i === stageIdx && active;
          return (
            <li key={s} aria-current={current ? "step" : undefined} className={`stepper__step ${done ? "is-done" : ""} ${current ? "is-current" : ""}`}>
              <span className="stepper__dot">{done ? <CheckCircle2 aria-hidden /> : String(i + 1).padStart(2, "0")}</span>
              <span className="stepper__label">{STAGE_LABEL[s]}</span>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-main">
        <div className="grid" style={{ alignContent: "start" }}>
          <Panel title="Currículo" icon={FileText} bodyClass="" action={resume?.storageKey ? <DocumentPreview doc={resume} label="Tela cheia" /> : undefined}>
            {resume?.storageKey ? <DocumentStage doc={resume} /> : <p className="panel__body small muted">Nenhum currículo anexado.</p>}
          </Panel>

          <Panel title="Histórico do processo" icon={History}>
            <ol className="timeline">
              {events.map((e) => {
                const actor = e.actorUserId ? userById(d, e.actorUserId)?.name : null;
                return (
                  <li key={e.id} className={e.type === "CONTRATACAO" || e.type === "CRIADA" ? "is-key" : ""}>
                    <div className="timeline__title">{e.type === "ETAPA" ? `${STAGE_LABEL[e.fromStage!]} → ${STAGE_LABEL[e.toStage!]}` : EVENT_LABEL[e.type]}</div>
                    <div className="timeline__meta">
                      {fmtDateTime(e.createdAt)}
                      {actor ? ` · ${actor}` : e.type === "CRIADA" ? " · site" : ""}
                    </div>
                    {e.note ? <div className="timeline__note">{e.note}</div> : null}
                  </li>
                );
              })}
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
                  {cand.phone}
                </a>
              </dd>
              <dt>
                <MapPin size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} /> Cidade
              </dt>
              <dd>{cand.city}</dd>
              {cand.education ? (
                <>
                  <dt>
                    <GraduationCap size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} /> Formação
                  </dt>
                  <dd>{cand.education}</dd>
                </>
              ) : null}
              {cand.experience ? (
                <>
                  <dt>Experiência</dt>
                  <dd>{cand.experience}</dd>
                </>
              ) : null}
              {cand.linkedin ? (
                <>
                  <dt>
                    <LinkedinIcon width={12} height={12} aria-hidden style={{ display: "inline", verticalAlign: "-1px" }} /> LinkedIn
                  </dt>
                  <dd className="truncate">{cand.linkedin}</dd>
                </>
              ) : null}
              <dt>Vaga</dt>
              <dd>
                {vac.title} <span className="subtle">({dept(d, vac.departmentId)?.name})</span>
              </dd>
              <dt>Candidatura</dt>
              <dd>{fmtDateTime(app.createdAt)}</dd>
              <dt>Avaliação</dt>
              <dd>
                <Stars value={app.rating} />
              </dd>
              {app.interviewAt ? (
                <>
                  <dt>Entrevista</dt>
                  <dd>
                    <strong>{fmtDateTime(app.interviewAt)}</strong>
                  </dd>
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
              <ActionForm action={moveApplicationForm} hidden={{ id: app.id }} className="stack" resetOnSuccess>
                <SelectField
                  key={app.stage}
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
                <TextField
                  key={app.interviewAt ?? "none"}
                  label="Data e hora"
                  name="when"
                  type="datetime-local"
                  defaultValue={app.interviewAt ? new Date(app.interviewAt).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 16).replace(" ", "T") : ""}
                />
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
                    <Link href={`/rh/candidatos/${o.id}`} className="list-item has-link">
                      <span className="list-item__main">
                        <span className="list-item__title">{vacancy(d, o.vacancyId)?.title}</span>
                        <span className="list-item__sub">{fmtDate(o.createdAt)}</span>
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
