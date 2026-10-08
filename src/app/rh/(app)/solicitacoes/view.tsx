"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Inbox, Search, Hourglass, Loader, CheckCircle2, AlertTriangle } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageHeader, Kpi } from "@/components/rh/ui";
import { FilterForm } from "@/components/rh/filter-form";
import { Badge, Empty } from "@/components/ui/bits";
import { NewRequestButton } from "@/components/rh/request-new";
import { useRh } from "@/components/rh/demo-app";
import { employee, employeesScope, matches, requestsList, type RequestListRow } from "@/lib/demo/queries";
import { PRIORITY_LABEL, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { relative } from "@/lib/format";
import { REQUEST_STATUS, REQUEST_TYPES, type RequestStatus } from "@/lib/demo/types";

export function SolicitacoesView() {
  const { d, user } = useRh();
  const sp = useSearchParams();
  const str = (k: string) => sp.get(k) ?? "";
  const hr = can(user.role, "requests.manage");
  const team = can(user.role, "requests.view_team");
  const status = str("status");
  const type = str("tipo");
  const q = str("q").slice(0, 60);

  const scope = employeesScope(user);
  const base = (r: RequestListRow) => hr || r.authorUserId === user.id || (team && !!employee(d, r.employeeId) && scope(employee(d, r.employeeId)!));
  const statusOk = (r: RequestListRow) =>
    status === "abertas" || !status ? (hr || team ? r.status === "PENDENTE" || r.status === "EM_ANALISE" : true) : status === "todas" ? true : REQUEST_STATUS.includes(status as RequestStatus) ? r.status === status : true;
  const rows = requestsList(d, (r) => base(r) && statusOk(r) && (!type || r.type === type) && matches(q, r.subject, r.employeeName), 200);
  const all = requestsList(d, base, 1000);
  const stat = (s: RequestStatus[]) => all.filter((r) => s.includes(r.status)).length;
  const high = all.filter((r) => r.priority === "ALTA" && (r.status === "PENDENTE" || r.status === "EM_ANALISE")).length;

  return (
    <>
      <PageHeader
        eyebrow={hr ? "Gestão" : team ? "Minha equipe" : "Meu espaço"}
        title="Solicitações"
        description={hr ? "Pedidos dos colaboradores ao RH, por prioridade." : team ? "Pedidos da sua equipe e os seus. O atendimento é feito pelo RH." : "Acompanhe seus pedidos ao RH."}
        actions={user.employeeId ? <NewRequestButton open={sp.get("nova") === "1"} /> : null}
      />
      <div className="kpis">
        <Kpi icon={Hourglass} label="Pendentes" value={stat(["PENDENTE"])} alert={hr && stat(["PENDENTE"]) > 0} href="/rh/solicitacoes?status=PENDENTE" />
        <Kpi icon={Loader} label="Em análise" value={stat(["EM_ANALISE"])} href="/rh/solicitacoes?status=EM_ANALISE" />
        <Kpi icon={AlertTriangle} label="Prioridade alta em aberto" value={high} />
        <Kpi icon={CheckCircle2} label="Respondidas" value={stat(["APROVADO", "RECUSADO", "CONCLUIDO"])} href="/rh/solicitacoes?status=todas" />
      </div>
      <section className="panel">
        <FilterForm>
          <div className="input-icon">
            <Search aria-hidden />
            <label htmlFor="q" className="sr-only">
              Buscar
            </label>
            <input id="q" name="q" type="search" className="input input--sm" placeholder={hr || team ? "Assunto ou colaborador" : "Assunto"} defaultValue={q} />
          </div>
          <label htmlFor="status" className="sr-only">
            Situação
          </label>
          <select id="status" name="status" className="select select--sm" defaultValue={status} key={`st-${status}`}>
            <option value="">{hr || team ? "Em aberto" : "Todas"}</option>
            {hr || team ? <option value="todas">Todas</option> : null}
            {REQUEST_STATUS.map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <label htmlFor="tipo" className="sr-only">
            Tipo
          </label>
          <select id="tipo" name="tipo" className="select select--sm" defaultValue={type}>
            <option value="">Todos os tipos</option>
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {REQUEST_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </FilterForm>
        {rows.length ? (
          <div className="table-wrap tab-panel" key={`${status}-${type}-${q}`}>
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">Assunto</th>
                  {hr || team ? <th scope="col">Colaborador</th> : null}
                  <th scope="col">Tipo</th>
                  <th scope="col">Prioridade</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Aberta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="has-link">
                    <td className="cell-main">
                      <Link href={`/rh/solicitacoes/${r.id}`} className="row-link">
                        {r.subject}
                      </Link>
                    </td>
                    {hr || team ? <td data-label="Colaborador">{r.employeeName ?? r.authorName}</td> : null}
                    <td data-label="Tipo">{REQUEST_TYPE_LABEL[r.type]}</td>
                    <td data-label="Prioridade">
                      <Badge status={r.priority}>{PRIORITY_LABEL[r.priority]}</Badge>
                    </td>
                    <td data-label="Situação">
                      <Badge status={r.status}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                    </td>
                    <td data-label="Aberta" className="nowrap subtle">
                      {relative(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={Inbox}
            title={status || type || q ? "Nada encontrado com esses filtros" : hr ? "Nenhuma solicitação em aberto" : "Nenhuma solicitação"}
            action={
              status || type || q ? (
                <Link href="/rh/solicitacoes" className="btn btn--outline btn--sm">
                  Limpar filtros
                </Link>
              ) : undefined
            }
          >
            {!hr && !team ? "Precisa de uma declaração ou de uma correção no cadastro? Abra uma solicitação." : null}
          </Empty>
        )}
      </section>
    </>
  );
}
