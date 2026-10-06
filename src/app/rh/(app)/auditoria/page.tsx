import type { Metadata } from "next";
import { and, count, desc, eq, gte, like, lte, or, type SQL } from "drizzle-orm";
import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/rh/ui";
import { FilterForm } from "@/components/rh/filter-form";
import { Badge, Empty } from "@/components/ui/bits";
import { AUDIT_LABEL, type AuditAction } from "@/lib/audit";

export const metadata: Metadata = { title: "Auditoria" };

const PAGE = 50;
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", ...o });

export default async function AuditoriaPage({ searchParams }: PageProps<"/rh/auditoria">) {
  await requireUser("audit.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const action = str("acao");
  const q = str("q").slice(0, 60);
  const from = str("de");
  const to = str("ate");
  const page = Math.max(1, Number(str("p")) || 1);
  const where: SQL | undefined = and(
    action && action in AUDIT_LABEL ? eq(schema.auditLogs.action, action) : undefined,
    q ? or(like(schema.auditLogs.summary, `%${q}%`), like(schema.auditLogs.actorLabel, `%${q}%`)) : undefined,
    /^\d{4}-\d{2}-\d{2}$/.test(from) ? gte(schema.auditLogs.createdAt, new Date(`${from}T00:00:00-03:00`).toISOString()) : undefined,
    /^\d{4}-\d{2}-\d{2}$/.test(to) ? lte(schema.auditLogs.createdAt, new Date(`${to}T23:59:59-03:00`).toISOString()) : undefined,
  );
  const total = db.select({ n: count() }).from(schema.auditLogs).where(where).get()!.n;
  const rows = db.select().from(schema.auditLogs).where(where).orderBy(desc(schema.auditLogs.createdAt), desc(schema.auditLogs.id)).limit(PAGE).offset((page - 1) * PAGE).all();
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const s = new URLSearchParams();
    if (action) s.set("acao", action);
    if (q) s.set("q", q);
    if (from) s.set("de", from);
    if (to) s.set("ate", to);
    if (p > 1) s.set("p", String(p));
    return s.size ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader eyebrow="Administração" title="Auditoria" description={`${total} registros. Logins, alterações, aprovações, uploads, acessos a arquivos e mudanças de permissão. Os registros não podem ser editados.`} />
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
          <div className="table-wrap">
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
          <Empty icon={ShieldCheck} title="Nenhum registro com esses filtros" />
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
