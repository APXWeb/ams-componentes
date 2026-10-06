import { alias } from "drizzle-orm/sqlite-core";
import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { Briefcase, Building2, CalendarDays, Pencil, UserX, History, Palmtree, Inbox, FileText, ImageUp, KeyRound, Users, ExternalLink } from "lucide-react";
import { db, schema } from "@/db";
import type { CurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/rh/ui";
import { Avatar, Badge, Empty, Panel } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { FileDrop, TextAreaField, TextField } from "@/components/ui/form";
import { DocumentHrActions, DocumentSelfUpload, DocumentTable } from "@/components/rh/documents";
import { VacationTable } from "@/components/rh/vacations";
import { EMPLOYEE_STATUS_LABEL, EMPLOYMENT_LABEL, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL, PRIORITY_LABEL } from "@/lib/labels";
import { fmtDate, fmtDateLong, fmtDateTime, relative, todayISO, daysBetween } from "@/lib/format";
import { ACCEPT_PHOTO } from "@/lib/storage";
import { deactivateEmployee, uploadEmployeePhoto } from "@/app/rh/(app)/funcionarios/actions";
import { AUDIT_LABEL, type AuditAction } from "@/lib/audit";

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

export function EmployeeProfile({ user, employeeId, tab: rawTab, basePath, self }: { user: CurrentUser; employeeId: number; tab?: string; basePath: string; self?: boolean }) {
  const manager = alias(schema.employees, "manager");
  const e = db
    .select({
      emp: schema.employees,
      position: schema.positions.title,
      department: schema.departments.name,
      managerName: manager.name,
      managerId: manager.id,
    })
    .from(schema.employees)
    .innerJoin(schema.positions, eq(schema.positions.id, schema.employees.positionId))
    .innerJoin(schema.departments, eq(schema.departments.id, schema.employees.departmentId))
    .leftJoin(manager, eq(manager.id, schema.employees.managerId))
    .where(eq(schema.employees.id, employeeId))
    .get()!;
  const emp = e.emp;
  const hr = can(user.role, "employees.manage");
  const docsAllowed = hr || self;
  const tabs = TABS.filter((t) => t.id !== "documentos" || docsAllowed);
  const tab: Tab = (tabs.find((t) => t.id === rawTab)?.id ?? "geral") as Tab;
  const active = emp.status !== "DESLIGADO";
  const account = db.select({ email: schema.users.email, role: schema.users.role, active: schema.users.active, lastLoginAt: schema.users.lastLoginAt }).from(schema.users).where(eq(schema.users.employeeId, emp.id)).get();

  return (
    <>
      <PageHeader
        back={self ? undefined : { href: "/rh/funcionarios", label: hr ? "Funcionários" : "Minha equipe" }}
        eyebrow={self ? "Meu perfil" : undefined}
        title={
          <span className="profile-head">
            <Avatar name={emp.name} photoId={emp.photoDocumentId} size="lg" />
            <span>
              <span style={{ display: "block" }}>{emp.name}</span>
              <span className="meta-row" style={{ fontFamily: "var(--font-body)", fontWeight: 400, letterSpacing: 0 }}>
                <span>
                  <Briefcase aria-hidden /> {e.position}
                </span>
                <span>
                  <Building2 aria-hidden /> {e.department}
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
                description="A foto é visível apenas dentro do sistema."
                action={uploadEmployeePhoto}
                submitLabel="Salvar foto"
                hidden={{ id: emp.id }}
              >
                <FileDrop name="photo" accept={ACCEPT_PHOTO} label="Imagem" help="JPG, PNG ou WEBP, até 8 MB" required />
              </ActionModal>
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
          </Link>
        ))}
      </nav>

      {tab === "geral" ? (
        <div className="grid grid-main">
          <div className="grid" style={{ alignContent: "start" }}>
            <Panel title="Dados do colaborador">
              <dl className="dl">
                <dt>E-mail corporativo</dt>
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
                <dt>Telefone</dt>
                <dd>{emp.phone ?? "—"}</dd>
                <dt>Cidade</dt>
                <dd>{emp.city ?? "—"}</dd>
                <dt>Cargo</dt>
                <dd>{e.position}</dd>
                <dt>Departamento</dt>
                <dd>{e.department}</dd>
                <dt>Gestor direto</dt>
                <dd>
                  {e.managerId ? (
                    can(user.role, "employees.view_all") ? (
                      <Link className="link" href={`/rh/funcionarios/${e.managerId}`}>
                        {e.managerName}
                      </Link>
                    ) : (
                      e.managerName
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
                <dt>Saldo de férias</dt>
                <dd>{emp.vacationBalance} dias</dd>
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
            <TeamPanel employeeId={emp.id} canOpen={can(user.role, "employees.view_all") || can(user.role, "employees.view_team")} />
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

      {tab === "documentos" && docsAllowed ? <DocumentsTab employeeId={emp.id} hr={hr} self={!!self} active={active} /> : null}
      {tab === "ferias" ? <VacationsTab employeeId={emp.id} /> : null}
      {tab === "solicitacoes" ? <RequestsTab employeeId={emp.id} /> : null}
      {tab === "historico" ? <HistoryTab employeeId={emp.id} showAudit={can(user.role, "audit.view") || hr} /> : null}
    </>
  );
}

function TeamPanel({ employeeId, canOpen }: { employeeId: number; canOpen: boolean }) {
  const reports = db
    .select({ id: schema.employees.id, name: schema.employees.name, photo: schema.employees.photoDocumentId, position: schema.positions.title })
    .from(schema.employees)
    .innerJoin(schema.positions, eq(schema.positions.id, schema.employees.positionId))
    .where(and(eq(schema.employees.managerId, employeeId), ne(schema.employees.status, "DESLIGADO")))
    .all();
  if (!reports.length) return null;
  return (
    <Panel title={`Equipe direta (${reports.length})`} icon={Users} bodyClass="">
      <ul className="list" style={{ maxHeight: 360, overflowY: "auto" }}>
        {reports.map((r) => {
          const inner = (
            <>
              <Avatar name={r.name} photoId={r.photo} size="sm" />
              <span className="list-item__main">
                <span className="list-item__title">{r.name}</span>
                <span className="list-item__sub">{r.position}</span>
              </span>
            </>
          );
          return (
            <li key={r.id}>
              {canOpen ? (
                <Link href={`/rh/funcionarios/${r.id}`} className="list-item">
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

function DocumentsTab({ employeeId, hr, self, active }: { employeeId: number; hr: boolean; self: boolean; active: boolean }) {
  const photo = db.select({ p: schema.employees.photoDocumentId }).from(schema.employees).where(eq(schema.employees.id, employeeId)).get()?.p;
  const docs = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.employeeId, employeeId))
    .orderBy(desc(schema.documents.createdAt))
    .all()
    .filter((d) => d.id !== photo);
  const order = { PENDENTE: 0, RECUSADO: 1, ENVIADO: 2, VALIDADO: 3 };
  docs.sort((a, b) => order[a.status] - order[b.status]);
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

function VacationsTab({ employeeId }: { employeeId: number }) {
  const rows = db.select().from(schema.vacations).where(eq(schema.vacations.employeeId, employeeId)).orderBy(desc(schema.vacations.startDate)).all();
  return (
    <Panel title="Férias" icon={Palmtree} bodyClass="" action={<Link href="/rh/ferias" className="btn btn--ghost btn--sm">Abrir módulo de férias</Link>}>
      <VacationTable rows={rows.map((r) => ({ ...r, employeeName: "" }))} showEmployee={false} />
    </Panel>
  );
}

function RequestsTab({ employeeId }: { employeeId: number }) {
  const rows = db.select().from(schema.requests).where(eq(schema.requests.employeeId, employeeId)).orderBy(desc(schema.requests.createdAt)).all();
  return (
    <Panel title="Solicitações" icon={Inbox} bodyClass="">
      {rows.length ? (
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/rh/solicitacoes/${r.id}`} className="list-item">
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
        <Empty icon={Inbox} title="Nenhuma solicitação" />
      )}
    </Panel>
  );
}

function HistoryTab({ employeeId, showAudit }: { employeeId: number; showAudit: boolean }) {
  const hist = db
    .select({ id: schema.employeeHistory.id, type: schema.employeeHistory.type, description: schema.employeeHistory.description, at: schema.employeeHistory.occurredAt, actor: schema.users.name })
    .from(schema.employeeHistory)
    .leftJoin(schema.users, eq(schema.users.id, schema.employeeHistory.actorUserId))
    .where(eq(schema.employeeHistory.employeeId, employeeId))
    .orderBy(desc(schema.employeeHistory.occurredAt))
    .all();
  const logs = showAudit
    ? db
        .select()
        .from(schema.auditLogs)
        .where(and(eq(schema.auditLogs.entityType, "employee"), eq(schema.auditLogs.entityId, employeeId), ne(schema.auditLogs.action, "DOWNLOAD")))
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(20)
        .all()
    : [];
  const LABEL: Record<string, string> = { ADMISSAO: "Admissão", CARGO: "Mudança de cargo", DEPARTAMENTO: "Transferência", GESTOR: "Mudança de gestor", STATUS: "Situação", CADASTRO: "Cadastro", DESLIGAMENTO: "Desligamento" };
  return (
    <div className="grid grid-2">
      <Panel title="Linha do tempo" icon={History}>
        <ol className="timeline">
          {hist.map((h) => (
            <li key={h.id} className={h.type === "ADMISSAO" || h.type === "DESLIGAMENTO" || h.type === "CARGO" ? "is-key" : ""}>
              <div className="timeline__title">{LABEL[h.type]}</div>
              <div className="timeline__meta">
                {fmtDate(h.at)}
                {h.actor ? ` · por ${h.actor}` : ""}
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
            <Empty icon={CalendarDays} title="Sem alterações registradas" />
          )}
        </Panel>
      ) : null}
    </div>
  );
}

