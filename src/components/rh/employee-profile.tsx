"use client";

import Link from "next/link";
import { Briefcase, Building2, CalendarDays, Pencil, UserX, History, Palmtree, Inbox, FileText, ImageUp, KeyRound, Users, ExternalLink, Mail, Phone, MapPin, UserRound, Trash2 } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/rh/ui";
import { Avatar, Badge, Empty, Panel } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { FileDrop, TextAreaField, TextField } from "@/components/ui/form";
import { DocumentHrActions, DocumentSelfUpload, DocumentTable } from "@/components/rh/documents";
import { VacationTable } from "@/components/rh/vacations";
import { EMPLOYEE_STATUS_LABEL, EMPLOYMENT_LABEL, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL, PRIORITY_LABEL, VACATION_STATUS_LABEL } from "@/lib/labels";
import { fmtDate, fmtDateLong, fmtDateTime, relative, todayISO, daysBetween } from "@/lib/format";
import { ACCEPT_PHOTO } from "@/lib/demo/actions/util";
import { deactivateEmployee, removeEmployeePhoto, uploadEmployeePhoto } from "@/lib/demo/actions/employees";
import { AUDIT_LABEL, type AuditAction } from "@/lib/demo/audit";
import { dept, employee, position, userById, userOfEmployee } from "@/lib/demo/queries";
import type { CurrentUser, DemoData } from "@/lib/demo/types";

const TABS = [
  { id: "geral", label: "Visão geral" },
  { id: "documentos", label: "Documentos" },
  { id: "ferias", label: "Férias" },
  { id: "solicitacoes", label: "Solicitações" },
  { id: "historico", label: "Histórico" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function tenure(hiredAt: string, end?: string | null) {
  const days = daysBetween(hiredAt, end ?? todayISO());
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  if (y <= 0) return m <= 0 ? "menos de 1 mês" : `${m} ${m === 1 ? "mês" : "meses"}`;
  return `${y} ${y === 1 ? "ano" : "anos"}${m ? ` e ${m} ${m === 1 ? "mês" : "meses"}` : ""}`;
}

export function EmployeeProfile({ d, user, employeeId, tab: rawTab, basePath, self }: { d: DemoData; user: CurrentUser; employeeId: number; tab?: string | null; basePath: string; self?: boolean }) {
  const emp = employee(d, employeeId)!;
  const pos = position(d, emp.positionId)?.title ?? "";
  const department = dept(d, emp.departmentId)?.name ?? "";
  const manager = employee(d, emp.managerId);
  const hr = can(user.role, "employees.manage");
  const docsAllowed = hr || !!self;
  const tabs = TABS.filter((t) => t.id !== "documentos" || docsAllowed);
  const tab: Tab = (tabs.find((t) => t.id === rawTab)?.id ?? "geral") as Tab;
  const active = emp.status !== "DESLIGADO";
  const account = userOfEmployee(d, emp.id);
  const counts: Partial<Record<Tab, number>> = {
    documentos: d.documents.filter((x) => x.employeeId === emp.id && (x.status === "PENDENTE" || x.status === "ENVIADO" || x.status === "RECUSADO")).length,
    ferias: d.vacations.filter((v) => v.employeeId === emp.id && v.status === "PENDENTE").length,
    solicitacoes: d.requests.filter((r) => r.employeeId === emp.id && (r.status === "PENDENTE" || r.status === "EM_ANALISE")).length,
  };

  return (
    <>
      <PageHeader
        back={self ? undefined : { href: "/rh/funcionarios", label: hr ? "Funcionários" : "Minha equipe" }}
        eyebrow={self ? "Meu perfil" : undefined}
        title={
          <span className="profile-head">
            <Avatar name={emp.name} photo={emp.photo} size="lg" />
            <span>
              <span style={{ display: "block" }}>{emp.name}</span>
              <span className="meta-row" style={{ fontFamily: "var(--font-body)", fontWeight: 400, letterSpacing: 0 }}>
                <span>
                  <Briefcase aria-hidden /> {pos}
                </span>
                <span>
                  <Building2 aria-hidden /> {department}
                </span>
                <span>
                  <CalendarDays aria-hidden /> Desde {fmtDate(emp.hiredAt)}
                </span>
                <span>
                  <Badge status={emp.status}>{EMPLOYEE_STATUS_LABEL[emp.status]}</Badge>
                </span>
              </span>
            </span>
          </span>
        }
        actions={
          hr && active && !self ? (
            <>
              <ActionModal
                trigger={
                  <>
                    <ImageUp aria-hidden /> Foto
                  </>
                }
                triggerClass="btn btn--outline"
                title="Foto de perfil"
                description="A foto aparece no cadastro, nas listas e no menu do sistema."
                action={uploadEmployeePhoto}
                submitLabel="Salvar foto"
                hidden={{ id: emp.id }}
              >
                <FileDrop name="photo" accept={ACCEPT_PHOTO} label="Imagem" help="JPG, PNG ou WEBP, até 8 MB" required />
              </ActionModal>
              {emp.photo ? (
                <ActionModal trigger={<Trash2 aria-hidden />} triggerClass="btn btn--ghost btn--icon" title="Remover foto" description="O avatar volta a mostrar as iniciais." action={removeEmployeePhoto} submitLabel="Remover foto" submitClass="btn btn--danger" hidden={{ id: emp.id }} />
              ) : null}
              <ActionModal
                trigger={
                  <>
                    <UserX aria-hidden /> Desligar
                  </>
                }
                triggerClass="btn btn--danger-outline"
                title={`Desligar ${emp.name.split(" ")[0]}`}
                description="O cadastro é mantido para histórico, o acesso ao sistema é removido e a pessoa deixa de aparecer entre os ativos."
                action={deactivateEmployee}
                submitLabel="Confirmar desligamento"
                submitClass="btn btn--danger"
                hidden={{ id: emp.id }}
              >
                <TextField label="Data do desligamento" name="terminatedAt" type="date" defaultValue={todayISO()} />
                <TextAreaField label="Motivo" name="reason" rows={3} placeholder="Ex.: pedido de demissão, término de contrato" />
              </ActionModal>
              <Link href={`/rh/funcionarios/${emp.id}/editar`} className="btn">
                <Pencil aria-hidden /> Editar
              </Link>
            </>
          ) : null
        }
      />

      {!active ? (
        <div className="notice notice--warning" style={{ marginBottom: 16 }}>
          Desligado em {fmtDateLong(emp.terminatedAt)}. Motivo: {emp.terminationReason}.
        </div>
      ) : null}

      <nav className="tabs" aria-label="Seções do perfil" style={{ marginBottom: 18 }}>
        {tabs.map((t) => (
          <Link key={t.id} href={`${basePath}?aba=${t.id}`} className="tab" aria-current={tab === t.id ? "page" : undefined} scroll={false}>
            {t.label}
            {counts[t.id] ? <span className="tab__count">{counts[t.id]}</span> : null}
          </Link>
        ))}
      </nav>

      <div className="tab-panel" key={tab}>
        {tab === "geral" ? (
          <div className="grid grid-main">
            <div className="grid" style={{ alignContent: "start" }}>
              <Panel title="Dados do colaborador" icon={UserRound}>
                <dl className="dl">
                  <dt>
                    <Mail size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} /> E-mail corporativo
                  </dt>
                  <dd>
                    <a className="link" href={`mailto:${emp.corporateEmail}`}>
                      {emp.corporateEmail}
                    </a>
                  </dd>
                  {docsAllowed ? (
                    <>
                      <dt>E-mail pessoal</dt>
                      <dd>{emp.personalEmail ?? "—"}</dd>
                    </>
                  ) : null}
                  <dt>
                    <Phone size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} /> Telefone
                  </dt>
                  <dd>{emp.phone ? <a className="link" href={`tel:+55${emp.phone.replace(/\D/g, "")}`}>{emp.phone}</a> : "—"}</dd>
                  <dt>
                    <MapPin size={13} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} /> Cidade
                  </dt>
                  <dd>{emp.city ? `${emp.city}, SP` : "—"}</dd>
                  <dt>Cargo</dt>
                  <dd>{pos}</dd>
                  <dt>Departamento</dt>
                  <dd>{department}</dd>
                  <dt>Gestor direto</dt>
                  <dd>
                    {manager ? (
                      can(user.role, "employees.view_all") ? (
                        <Link className="link" href={`/rh/funcionarios/${manager.id}`}>
                          {manager.name}
                        </Link>
                      ) : (
                        manager.name
                      )
                    ) : (
                      "—"
                    )}
                  </dd>
                  <dt>Admissão</dt>
                  <dd>
                    {fmtDateLong(emp.hiredAt)} <span className="subtle">({tenure(emp.hiredAt, emp.terminatedAt)})</span>
                  </dd>
                  <dt>Contratação</dt>
                  <dd>{EMPLOYMENT_LABEL[emp.employmentType]}</dd>
                  <dt>Matrícula</dt>
                  <dd className="tabular">{String(1000 + emp.id).padStart(6, "0")}</dd>
                  <dt>Saldo de férias</dt>
                  <dd>
                    {emp.vacationBalance} dias
                    {counts.ferias ? <span className="subtle"> · {counts.ferias} pedido(s) aguardando</span> : null}
                  </dd>
                </dl>
              </Panel>
              {emp.sourceApplicationId && can(user.role, "recruitment.view") ? (
                <div className="notice">
                  <ExternalLink aria-hidden />
                  <span>
                    Contratado pelo recrutamento.{" "}
                    <Link className="link" href={`/rh/candidatos/${emp.sourceApplicationId}`}>
                      Ver processo seletivo
                    </Link>
                  </span>
                </div>
              ) : null}
            </div>
            <div className="grid" style={{ alignContent: "start" }}>
              <TeamPanel d={d} employeeId={emp.id} canOpen={can(user.role, "employees.view_all") || can(user.role, "employees.view_team")} />
              <NextVacationPanel d={d} employeeId={emp.id} basePath={basePath} />
              <Panel title="Acesso ao sistema" icon={KeyRound}>
                {account ? (
                  <dl className="dl">
                    <dt>Login</dt>
                    <dd>{account.email}</dd>
                    <dt>Situação</dt>
                    <dd>{account.active ? <Badge tone="success">Ativo</Badge> : <Badge>Bloqueado</Badge>}</dd>
                    <dt>Último acesso</dt>
                    <dd>{account.lastLoginAt ? fmtDateTime(account.lastLoginAt) : "Nunca acessou"}</dd>
                  </dl>
                ) : (
                  <p className="small muted">
                    Sem acesso ao sistema.{" "}
                    {can(user.role, "users.manage") ? (
                      <Link className="link" href={`/rh/usuarios?novo=${emp.id}`}>
                        Criar acesso
                      </Link>
                    ) : null}
                  </p>
                )}
              </Panel>
            </div>
          </div>
        ) : null}

        {tab === "documentos" && docsAllowed ? <DocumentsTab d={d} employeeId={emp.id} hr={hr} self={!!self} active={active} /> : null}
        {tab === "ferias" ? <VacationsTab d={d} employeeId={emp.id} self={!!self} /> : null}
        {tab === "solicitacoes" ? <RequestsTab d={d} employeeId={emp.id} /> : null}
        {tab === "historico" ? <HistoryTab d={d} employeeId={emp.id} showAudit={can(user.role, "audit.view") || hr} /> : null}
      </div>
    </>
  );
}

function TeamPanel({ d, employeeId, canOpen }: { d: DemoData; employeeId: number; canOpen: boolean }) {
  const reports = d.employees.filter((e) => e.managerId === employeeId && e.status !== "DESLIGADO").sort((a, b) => a.name.localeCompare(b.name));
  if (!reports.length) return null;
  return (
    <Panel title={`Equipe direta (${reports.length})`} icon={Users} bodyClass="">
      <ul className="list" style={{ maxHeight: 360, overflowY: "auto" }}>
        {reports.map((r) => {
          const inner = (
            <>
              <Avatar name={r.name} photo={r.photo} size="sm" />
              <span className="list-item__main">
                <span className="list-item__title">{r.name}</span>
                <span className="list-item__sub">{position(d, r.positionId)?.title}</span>
              </span>
            </>
          );
          return (
            <li key={r.id}>
              {canOpen ? (
                <Link href={`/rh/funcionarios/${r.id}`} className="list-item has-link">
                  {inner}
                </Link>
              ) : (
                <div className="list-item">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function NextVacationPanel({ d, employeeId, basePath }: { d: DemoData; employeeId: number; basePath: string }) {
  const today = todayISO();
  const next = d.vacations.filter((v) => v.employeeId === employeeId && (v.status === "APROVADO" || v.status === "PENDENTE") && v.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return (
    <Panel title="Próximas férias" icon={Palmtree}>
      {next ? (
        <div className="row between wrap">
          <span>
            <strong className="tabular">
              {fmtDate(next.startDate)} a {fmtDate(next.endDate)}
            </strong>
            <span className="small muted" style={{ display: "block" }}>
              {next.days} dias{next.startDate > today ? ` · começam em ${daysBetween(today, next.startDate)} dias` : " · em andamento"}
            </span>
          </span>
          <Badge status={next.status}>{VACATION_STATUS_LABEL[next.status]}</Badge>
        </div>
      ) : (
        <p className="small muted">
          Nenhum período programado.{" "}
          <Link className="link" href={`${basePath}?aba=ferias`} scroll={false}>
            Ver histórico de férias
          </Link>
        </p>
      )}
    </Panel>
  );
}

function DocumentsTab({ d, employeeId, hr, self, active }: { d: DemoData; employeeId: number; hr: boolean; self: boolean; active: boolean }) {
  const order = { PENDENTE: 0, RECUSADO: 1, ENVIADO: 2, VALIDADO: 3 };
  const docs = d.documents
    .filter((x) => x.employeeId === employeeId)
    .sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt));
  return (
    <Panel
      title="Documentos"
      icon={FileText}
      bodyClass=""
      action={active ? <div className="row" style={{ "--gap": "6px" } as React.CSSProperties}>{hr && !self ? <DocumentHrActions employeeId={employeeId} /> : <DocumentSelfUpload />}</div> : undefined}
    >
      <DocumentTable docs={docs} hr={hr && !self} canUpload={active && (self || hr)} />
    </Panel>
  );
}

function VacationsTab({ d, employeeId, self }: { d: DemoData; employeeId: number; self: boolean }) {
  const rows = d.vacations.filter((v) => v.employeeId === employeeId).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    <Panel title="Férias" icon={Palmtree} bodyClass="" action={<Link href="/rh/ferias" className="btn btn--ghost btn--sm">{self ? "Solicitar férias" : "Abrir módulo de férias"}</Link>}>
      <VacationTable rows={rows.map((r) => ({ ...r, employeeName: "" }))} showEmployee={false} />
    </Panel>
  );
}

function RequestsTab({ d, employeeId }: { d: DemoData; employeeId: number }) {
  const rows = d.requests.filter((r) => r.employeeId === employeeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Panel title="Solicitações" icon={Inbox} bodyClass="">
      {rows.length ? (
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/rh/solicitacoes/${r.id}`} className="list-item has-link">
                <span className="list-item__main">
                  <span className="list-item__title">{r.subject}</span>
                  <span className="list-item__sub">
                    {REQUEST_TYPE_LABEL[r.type]} · prioridade {PRIORITY_LABEL[r.priority].toLowerCase()} · {relative(r.createdAt)}
                  </span>
                </span>
                <Badge status={r.status}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={Inbox} title="Nenhuma solicitação">
          Pedidos de declarações, atualizações cadastrais e justificativas aparecem aqui.
        </Empty>
      )}
    </Panel>
  );
}

const HISTORY_LABEL: Record<string, string> = { ADMISSAO: "Admissão", CARGO: "Mudança de cargo", DEPARTAMENTO: "Transferência", GESTOR: "Mudança de gestor", STATUS: "Situação", CADASTRO: "Cadastro", DESLIGAMENTO: "Desligamento" };

function HistoryTab({ d, employeeId, showAudit }: { d: DemoData; employeeId: number; showAudit: boolean }) {
  const hist = d.employeeHistory.filter((h) => h.employeeId === employeeId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const logs = showAudit
    ? d.auditLogs
        .filter((l) => l.entityType === "employee" && l.entityId === employeeId && l.action !== "DOWNLOAD")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20)
    : [];
  return (
    <div className="grid grid-2">
      <Panel title="Linha do tempo" icon={History}>
        <ol className="timeline">
          {hist.map((h) => (
            <li key={h.id} className={h.type === "ADMISSAO" || h.type === "DESLIGAMENTO" || h.type === "CARGO" ? "is-key" : ""}>
              <div className="timeline__title">{HISTORY_LABEL[h.type]}</div>
              <div className="timeline__meta">
                {fmtDate(h.occurredAt)}
                {h.actorUserId ? ` · por ${userById(d, h.actorUserId)?.name}` : ""}
              </div>
              <div className="timeline__note">{h.description}</div>
            </li>
          ))}
        </ol>
      </Panel>
      {showAudit ? (
        <Panel title="Registro de alterações" icon={CalendarDays} bodyClass="">
          {logs.length ? (
            <ul className="list">
              {logs.map((l) => (
                <li key={l.id} className="list-item">
                  <span className="list-item__main">
                    <span className="list-item__title" style={{ whiteSpace: "normal" }}>
                      {l.summary}
                    </span>
                    <span className="list-item__sub">
                      {AUDIT_LABEL[l.action as AuditAction] ?? l.action} · {l.actorLabel} · {fmtDateTime(l.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={CalendarDays} title="Sem alterações registradas">
              Edições de cadastro, fotos e desligamentos feitos no sistema aparecem aqui.
            </Empty>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
