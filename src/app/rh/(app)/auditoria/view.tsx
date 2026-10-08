"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/rh/ui";
import { FilterForm } from "@/components/rh/filter-form";
import { Badge, Empty } from "@/components/ui/bits";
import { Guard, useRh } from "@/components/rh/demo-app";
import { matches } from "@/lib/demo/queries";
import { AUDIT_LABEL, type AuditAction } from "@/lib/demo/audit";

const PAGE = 50;
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", ...o });

export function AuditoriaView() {
  return (
    <Guard anyOf={["audit.view"]}>
      <Auditoria />
    </Guard>
  );
}

function Auditoria() {
  const { d } = useRh();
  const sp = useSearchParams();
  const str = (k: string) => sp.get(k) ?? "";
  const action = str("acao");
  const q = str("q").slice(0, 60);
  const from = str("de");
  const to = str("ate");
  const page = Math.max(1, Number(str("p")) || 1);
  const fromIso = /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00-03:00`).toISOString() : "";
  const toIso = /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59-03:00`).toISOString() : "";
  const filtered = d.auditLogs
    .filter((r) => !action || r.action === action)
    .filter((r) => matches(q, r.summary, r.actorLabel))
    .filter((r) => (!fromIso || r.createdAt >= fromIso) && (!toIso || r.createdAt <= toIso))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
  const qs = (p: number) => {
    const s = new URLSearchParams(sp);
    if (p > 1) s.set("p", String(p));
    else s.delete("p");
    return s.size ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader eyebrow="Administração" title="Auditoria" description={`${total} registros. Logins, alterações, aprovações, uploads e mudanças de permissão. Os registros não podem ser editados.`} />
      <section className="panel">
        <FilterForm>
          <div className="input-icon">
            <Search aria-hidden />
            <label htmlFor="q" className="sr-only">
              Buscar
            </label>
            <input id="q" name="q" type="search" className="input input--sm" placeholder="Usuário ou descrição" defaultValue={q} />
          </div>
          <label htmlFor="acao" className="sr-only">
            Ação
          </label>
          <select id="acao" name="acao" className="select select--sm" defaultValue={action}>
            <option value="">Todas as ações</option>
            {Object.entries(AUDIT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className="row small muted" style={{ "--gap": "6px" } as React.CSSProperties}>
            De <input type="date" name="de" className="input input--sm" defaultValue={from} style={{ width: "auto" }} />
          </label>
          <label className="row small muted" style={{ "--gap": "6px" } as React.CSSProperties}>
            até <input type="date" name="ate" className="input input--sm" defaultValue={to} style={{ width: "auto" }} />
          </label>
        </FilterForm>
        {rows.length ? (
          <div className="table-wrap tab-panel" key={`${action}-${q}-${from}-${to}-${page}`}>
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Hora</th>
                  <th scope="col">Usuário</th>
                  <th scope="col">Ação</th>
                  <th scope="col">Descrição</th>
                  <th scope="col">Origem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-main tabular nowrap">{fmt(r.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                    <td data-label="Hora" className="tabular nowrap">
                      {fmt(r.createdAt, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td data-label="Usuário">{r.actorLabel}</td>
                    <td data-label="Ação">
                      <Badge tone={r.action === "LOGIN_FALHOU" || r.action === "EXCLUSAO" ? "danger" : r.action === "PERMISSAO" ? "warning" : r.action === "CONTRATACAO" ? "success" : "neutral"} plain>
                        {AUDIT_LABEL[r.action as AuditAction] ?? r.action}
                      </Badge>
                    </td>
                    <td data-label="Descrição">{r.summary}</td>
                    <td data-label="Origem" className="mono xsmall subtle">
                      {r.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={ShieldCheck}
            title="Nenhum registro com esses filtros"
            action={
              <Link href="/rh/auditoria" className="btn btn--outline btn--sm">
                Limpar filtros
              </Link>
            }
          />
        )}
        {pages > 1 ? (
          <nav className="panel__foot row between" aria-label="Paginação">
            <span className="subtle">
              Página {page} de {pages}
            </span>
            <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
              {page > 1 ? (
                <Link className="btn btn--outline btn--sm" href={`/rh/auditoria${qs(page - 1)}`}>
                  Anterior
                </Link>
              ) : null}
              {page < pages ? (
                <Link className="btn btn--outline btn--sm" href={`/rh/auditoria${qs(page + 1)}`}>
                  Próxima
                </Link>
              ) : null}
            </span>
          </nav>
        ) : null}
      </section>
    </>
  );
}
