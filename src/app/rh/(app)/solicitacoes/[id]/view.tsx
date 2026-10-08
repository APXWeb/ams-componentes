"use client";

import Link from "next/link";
import { MessageSquare, Reply, Send, UserRound } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/rh/ui";
import { Avatar, Badge, Panel } from "@/components/ui/bits";
import { ActionForm } from "@/components/ui/modal";
import { SelectField, SubmitButton, TextAreaField } from "@/components/ui/form";
import { NotFoundState, useRh } from "@/components/rh/demo-app";
import { canSeeEmployee, dept, employee, position, userById } from "@/lib/demo/queries";
import { respondRequest } from "@/lib/demo/actions/requests";
import { REQUEST_STATUS } from "@/lib/demo/types";
import { PRIORITY_LABEL, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { fmtDateTime, relative } from "@/lib/format";

export function SolicitacaoView({ id }: { id: number }) {
  const { d, user } = useRh();
  const req = d.requests.find((r) => r.id === id);
  if (!req) return <NotFoundState what="Solicitação" />;
  const emp = employee(d, req.employeeId);
  const hr = can(user.role, "requests.manage");
  const allowed = hr || req.authorUserId === user.id || (can(user.role, "requests.view_team") && emp && canSeeEmployee(user, emp));
  if (!allowed) return <NotFoundState what="Solicitação" />;
  const who = emp?.name ?? userById(d, req.authorUserId)?.name ?? "Colaborador";
  const responder = userById(d, req.responderUserId)?.name;

  return (
    <div style={{ maxWidth: 1080 }}>
      <PageHeader
        back={{ href: "/rh/solicitacoes", label: "Solicitações" }}
        title={req.subject}
        description={
          <span className="row wrap" style={{ "--gap": "8px" } as React.CSSProperties}>
            <Badge status={req.status}>{REQUEST_STATUS_LABEL[req.status]}</Badge>
            <Badge status={req.priority}>Prioridade {PRIORITY_LABEL[req.priority].toLowerCase()}</Badge>
            <span>
              {REQUEST_TYPE_LABEL[req.type]} · aberta {relative(req.createdAt)} · protocolo #{String(req.id).padStart(5, "0")}
            </span>
          </span>
        }
      />
      <div className="grid grid-main">
        <Panel title="Conversa" icon={MessageSquare}>
          <ol className="timeline">
            <li className="is-key">
              <div className="timeline__title row" style={{ "--gap": "8px" } as React.CSSProperties}>
                <Avatar name={who} size="sm" photo={emp?.photo} /> {who}
              </div>
              <div className="timeline__meta">{fmtDateTime(req.createdAt)}</div>
              <div className="timeline__note pre-line">{req.message}</div>
            </li>
            {req.response ? (
              <li className="tab-panel" key={req.updatedAt}>
                <div className="timeline__title row" style={{ "--gap": "8px" } as React.CSSProperties}>
                  <Reply size={16} aria-hidden /> Resposta do RH {responder ? `· ${responder}` : ""}
                </div>
                <div className="timeline__meta">{fmtDateTime(req.respondedAt)}</div>
                <div className="timeline__note pre-line" style={{ background: "var(--navy-50)", borderColor: "var(--navy-100)" }}>
                  {req.response}
                </div>
              </li>
            ) : (
              <li>
                <div className="timeline__meta">{req.status === "EM_ANALISE" ? `Em análise pelo RH${responder ? ` (${responder})` : ""}. A resposta aparece aqui.` : "Aguardando resposta do RH."}</div>
              </li>
            )}
          </ol>
        </Panel>
        <div className="grid" style={{ alignContent: "start" }}>
          {hr ? (
            <Panel title="Responder" icon={Send}>
              <ActionForm action={respondRequest} hidden={{ id: req.id }} className="stack">
                <SelectField key={req.status} label="Situação" name="status" defaultValue={req.status === "PENDENTE" ? "EM_ANALISE" : req.status} options={REQUEST_STATUS.map((s) => ({ value: s, label: REQUEST_STATUS_LABEL[s] }))} />
                <TextAreaField label="Resposta ao colaborador" name="response" rows={5} optional defaultValue={req.response ?? ""} hint="Obrigatória para aprovar, recusar ou concluir." />
                <SubmitButton className="btn btn--block">Salvar resposta</SubmitButton>
              </ActionForm>
            </Panel>
          ) : null}
          {emp ? (
            <Panel title="Colaborador" icon={UserRound}>
              <div className="row" style={{ "--gap": "12px" } as React.CSSProperties}>
                <Avatar name={emp.name} photo={emp.photo} />
                <div style={{ minWidth: 0 }}>
                  {can(user.role, "employees.view_all") || can(user.role, "employees.view_team") ? (
                    <Link className="link" href={`/rh/funcionarios/${emp.id}`}>
                      {emp.name}
                    </Link>
                  ) : (
                    <strong>{emp.name}</strong>
                  )}
                  <div className="xsmall subtle">
                    {position(d, emp.positionId)?.title} · {dept(d, emp.departmentId)?.name}
                  </div>
                  <div className="xsmall subtle truncate">{emp.corporateEmail}</div>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
