import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { MessageSquare, Reply, Send } from "lucide-react";
import { canSeeEmployee, requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { REQUEST_STATUS } from "@/db/schema";
import { PageHeader } from "@/components/rh/ui";
import { Avatar, Badge, Panel } from "@/components/ui/bits";
import { ActionForm } from "@/components/ui/modal";
import { SelectField, SubmitButton, TextAreaField } from "@/components/ui/form";
import { SavedToast } from "@/components/rh/saved-toast";
import { PRIORITY_LABEL, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { fmtDateTime, relative } from "@/lib/format";
import { respondRequest } from "../actions";

export const metadata: Metadata = { title: "Solicitação" };

export default async function SolicitacaoPage({ params }: PageProps<"/rh/solicitacoes/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const author = alias(schema.users, "author");
  const responder = alias(schema.users, "responder");
  const r = Number.isInteger(id)
    ? db
        .select({ req: schema.requests, authorName: author.name, responderName: responder.name, emp: schema.employees })
        .from(schema.requests)
        .innerJoin(author, eq(author.id, schema.requests.authorUserId))
        .leftJoin(responder, eq(responder.id, schema.requests.responderUserId))
        .leftJoin(schema.employees, eq(schema.employees.id, schema.requests.employeeId))
        .where(eq(schema.requests.id, id))
        .get()
    : undefined;
  if (!r) notFound();
  const hr = can(user.role, "requests.manage");
  const allowed = hr || r.req.authorUserId === user.id || (can(user.role, "requests.view_team") && r.emp && canSeeEmployee(user, r.emp));
  if (!allowed) notFound();
  const { req } = r;
  const who = r.emp?.name ?? r.authorName;

  return (
    <div style={{ maxWidth: 1080 }}>
      <SavedToast flags={{ aberta: "Solicitação enviada ao RH." }} />
      <PageHeader
        back={{ href: "/rh/solicitacoes", label: "Solicitações" }}
        title={req.subject}
        description={
          <span className="row wrap" style={{ "--gap": "8px" } as React.CSSProperties}>
            <Badge status={req.status}>{REQUEST_STATUS_LABEL[req.status]}</Badge>
            <Badge status={req.priority}>Prioridade {PRIORITY_LABEL[req.priority].toLowerCase()}</Badge>
            <span>
              {REQUEST_TYPE_LABEL[req.type]} · aberta {relative(req.createdAt)}
            </span>
          </span>
        }
      />
      <div className="grid grid-main">
        <Panel title="Conversa" icon={MessageSquare}>
          <ol className="timeline">
            <li className="is-key">
              <div className="timeline__title row" style={{ "--gap": "8px" } as React.CSSProperties}>
                <Avatar name={who} size="sm" photoId={r.emp?.photoDocumentId} /> {who}
              </div>
              <div className="timeline__meta">{fmtDateTime(req.createdAt)}</div>
              <div className="timeline__note pre-line">{req.message}</div>
            </li>
            {req.response ? (
              <li>
                <div className="timeline__title row" style={{ "--gap": "8px" } as React.CSSProperties}>
                  <Reply size={16} aria-hidden /> Resposta do RH {r.responderName ? `· ${r.responderName}` : ""}
                </div>
                <div className="timeline__meta">{fmtDateTime(req.respondedAt)}</div>
                <div className="timeline__note pre-line" style={{ background: "var(--navy-50)", borderColor: "var(--navy-100)" }}>
                  {req.response}
                </div>
              </li>
            ) : (
              <li>
                <div className="timeline__meta">Aguardando resposta do RH.</div>
              </li>
            )}
          </ol>
        </Panel>
        <div className="grid" style={{ alignContent: "start" }}>
          {hr ? (
            <Panel title="Responder" icon={Send}>
              <ActionForm action={respondRequest} hidden={{ id: req.id }} className="stack">
                <SelectField
                  label="Situação"
                  name="status"
                  defaultValue={req.status === "PENDENTE" ? "EM_ANALISE" : req.status}
                  options={REQUEST_STATUS.map((s) => ({ value: s, label: REQUEST_STATUS_LABEL[s] }))}
                />
                <TextAreaField label="Resposta ao colaborador" name="response" rows={5} optional defaultValue={req.response ?? ""} hint="Obrigatória para aprovar, recusar ou concluir." />
                <SubmitButton className="btn btn--block">Salvar resposta</SubmitButton>
              </ActionForm>
            </Panel>
          ) : null}
          {r.emp ? (
            <Panel title="Colaborador">
              <div className="row" style={{ "--gap": "12px" } as React.CSSProperties}>
                <Avatar name={r.emp.name} photoId={r.emp.photoDocumentId} />
                <div>
                  {can(user.role, "employees.view_all") || can(user.role, "employees.view_team") ? (
                    <Link className="link" href={`/rh/funcionarios/${r.emp.id}`}>
                      {r.emp.name}
                    </Link>
                  ) : (
                    <strong>{r.emp.name}</strong>
                  )}
                  <div className="xsmall subtle">{r.emp.corporateEmail}</div>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
