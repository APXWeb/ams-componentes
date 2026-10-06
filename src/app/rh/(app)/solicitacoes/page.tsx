import type { Metadata } from "next";
import Link from "next/link";
import { and, count, eq, inArray, like, or, type SQL } from "drizzle-orm";
import { Inbox, Search, Hourglass, Loader, CheckCircle2, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { employeesScope } from "@/lib/rh-scope";
import { requestsList } from "@/lib/rh-data";
import { PageHeader, Kpi } from "@/components/rh/ui";
import { FilterForm } from "@/components/rh/filter-form";
import { Badge, Empty } from "@/components/ui/bits";
import { NewRequestButton } from "@/components/rh/request-new";
import { PRIORITY_LABEL, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { relative } from "@/lib/format";
import { REQUEST_STATUS, REQUEST_TYPES, type RequestStatus, type RequestType } from "@/db/schema";

export const metadata: Metadata = { title: "Solicitações" };

export default async function SolicitacoesPage({ searchParams }: PageProps<"/rh/solicitacoes">) {
  const user = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const hr = can(user.role, "requests.manage");
  const team = can(user.role, "requests.view_team");

  const status = str("status");
  const type = str("tipo");
  const q = str("q").slice(0, 60);
  const base: SQL | undefined = hr ? undefined : team ? or(employeesScope(user), eq(schema.requests.authorUserId, user.id)) : eq(schema.requests.authorUserId, user.id);
  const where = and(
    base,
    status === "abertas" || !status ? (hr || team ? inArray(schema.requests.status, ["PENDENTE", "EM_ANALISE"]) : undefined) : REQUEST_STATUS.includes(status as RequestStatus) ? eq(schema.requests.status, status as RequestStatus) : undefined,
    REQUEST_TYPES.includes(type as RequestType) ? eq(schema.requests.type, type as RequestType) : undefined,
    q ? or(like(schema.requests.subject, `%${q}%`), like(schema.employees.name, `%${q}%`)) : undefined,
  );
  const rows = requestsList(where, 200);
  const stat = (s: RequestStatus[]) =>
    db
      .select({ n: count() })
      .from(schema.requests)
      .leftJoin(schema.employees, eq(schema.employees.id, schema.requests.employeeId))
      .where(and(base, inArray(schema.requests.status, s)))
      .get()!.n;
  const high = db
    .select({ n: count() })
    .from(schema.requests)
    .leftJoin(schema.employees, eq(schema.employees.id, schema.requests.employeeId))
    .where(and(base, eq(schema.requests.priority, "ALTA"), inArray(schema.requests.status, ["PENDENTE", "EM_ANALISE"])))
    .get()!.n;

  return (
    <>
      <PageHeader
        eyebrow={hr ? "Gestão" : team ? "Minha equipe" : "Meu espaço"}
        title="Solicitações"
        description={hr ? "Pedidos dos colaboradores ao RH, por prioridade." : team ? "Pedidos da sua equipe e os seus. O atendimento é feito pelo RH." : "Acompanhe seus pedidos ao RH."}
        actions={user.employeeId ? <NewRequestButton open={sp.nova === "1"} /> : null}
      />
      <div className="kpis">
        <Kpi icon={Hourglass} label="Pendentes" value={stat(["PENDENTE"])} alert={hr && stat(["PENDENTE"]) > 0} />
        <Kpi icon={Loader} label="Em análise" value={stat(["EM_ANALISE"])} />
        <Kpi icon={AlertTriangle} label="Prioridade alta em aberto" value={high} />
        <Kpi icon={CheckCircle2} label="Respondidas" value={stat(["APROVADO", "RECUSADO", "CONCLUIDO"])} />
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
          <select id="status" name="status" className="select select--sm" defaultValue={status}>
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
          <div className="table-wrap">
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
          <Empty icon={Inbox} title={status || type || q ? "Nada encontrado com esses filtros" : hr ? "Nenhuma solicitação em aberto" : "Nenhuma solicitação"}>
            {!hr && !team ? "Precisa de uma declaração ou de uma correção no cadastro? Abra uma solicitação." : null}
          </Empty>
        )}
      </section>
    </>
  );
}
