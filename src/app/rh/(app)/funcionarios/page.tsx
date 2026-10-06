import { alias } from "drizzle-orm/sqlite-core";
import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { Search, UserPlus, Users, Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { employeesScope } from "@/lib/rh-scope";
import { PageHeader } from "@/components/rh/ui";
import { FilterForm } from "@/components/rh/filter-form";
import { Avatar, Badge, Empty } from "@/components/ui/bits";
import { EMPLOYEE_STATUS_LABEL, EMPLOYMENT_LABEL } from "@/lib/labels";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Funcionários" };

const PAGE = 25;

export default async function FuncionariosPage({ searchParams }: PageProps<"/rh/funcionarios">) {
  const user = await requireUser("employees.view_all", "employees.view_team");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").slice(0, 60);
  const dep = Number(str("dep")) || 0;
  const status = (["ATIVO", "AFASTADO", "DESLIGADO", "TODOS"] as const).find((s) => s === str("status")) ?? "ATIVOS";
  const order = str("ordem") === "admissao" ? "admissao" : "nome";
  const page = Math.max(1, Number(str("p")) || 1);
  const manageable = can(user.role, "employees.manage");

  const manager = alias(schema.employees, "manager");
  const where: (SQL | undefined)[] = [employeesScope(user)];
  if (q) where.push(or(like(schema.employees.name, `%${q}%`), like(schema.employees.corporateEmail, `%${q}%`), like(schema.positions.title, `%${q}%`)));
  if (dep) where.push(eq(schema.employees.departmentId, dep));
  if (status === "ATIVOS") where.push(or(eq(schema.employees.status, "ATIVO"), eq(schema.employees.status, "AFASTADO")));
  else if (status !== "TODOS") where.push(eq(schema.employees.status, status));
  const cond = and(...where);

  const total = db
    .select({ n: count() })
    .from(schema.employees)
    .innerJoin(schema.positions, eq(schema.positions.id, schema.employees.positionId))
    .where(cond)
    .get()!.n;
  const rows = db
    .select({
      id: schema.employees.id,
      name: schema.employees.name,
      email: schema.employees.corporateEmail,
      photo: schema.employees.photoDocumentId,
      position: schema.positions.title,
      department: schema.departments.name,
      manager: manager.name,
      hiredAt: schema.employees.hiredAt,
      status: schema.employees.status,
      type: schema.employees.employmentType,
    })
    .from(schema.employees)
    .innerJoin(schema.positions, eq(schema.positions.id, schema.employees.positionId))
    .innerJoin(schema.departments, eq(schema.departments.id, schema.employees.departmentId))
    .leftJoin(manager, eq(manager.id, schema.employees.managerId))
    .where(cond)
    .orderBy(order === "admissao" ? desc(schema.employees.hiredAt) : asc(schema.employees.name))
    .limit(PAGE)
    .offset((page - 1) * PAGE)
    .all();
  const departments = db.select({ id: schema.departments.id, name: schema.departments.name }).from(schema.departments).orderBy(asc(schema.departments.name)).all();
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (dep) s.set("dep", String(dep));
    if (status !== "ATIVOS") s.set("status", status);
    if (order !== "nome") s.set("ordem", order);
    if (p > 1) s.set("p", String(p));
    return s.size ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader
        eyebrow="Pessoas"
        title={manageable ? "Funcionários" : "Minha equipe"}
        description={`${total} ${total === 1 ? "pessoa encontrada" : "pessoas encontradas"}${manageable ? "" : " na sua equipe"}.`}
        actions={
          manageable ? (
            <>
              <a href={`/rh/exportar/funcionarios${qs(1)}`} className="btn btn--outline">
                <Download aria-hidden /> Exportar CSV
              </a>
              <Link href="/rh/funcionarios/novo" className="btn">
                <UserPlus aria-hidden /> Novo funcionário
              </Link>
            </>
          ) : null
        }
      />
      <section className="panel">
        <FilterForm>
          <div className="input-icon">
            <Search aria-hidden />
            <label htmlFor="q" className="sr-only">
              Buscar
            </label>
            <input id="q" name="q" type="search" className="input input--sm" placeholder="Nome, e-mail ou cargo" defaultValue={q} />
          </div>
          <label htmlFor="dep" className="sr-only">
            Departamento
          </label>
          <select id="dep" name="dep" className="select select--sm" defaultValue={dep || ""}>
            <option value="">Todos os departamentos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <label htmlFor="status" className="sr-only">
            Situação
          </label>
          <select id="status" name="status" className="select select--sm" defaultValue={status === "ATIVOS" ? "" : status}>
            <option value="">Ativos e afastados</option>
            <option value="ATIVO">Somente ativos</option>
            <option value="AFASTADO">Afastados</option>
            <option value="DESLIGADO">Desligados</option>
            <option value="TODOS">Todos</option>
          </select>
          <label htmlFor="ordem" className="sr-only">
            Ordenar
          </label>
          <select id="ordem" name="ordem" className="select select--sm" defaultValue={order === "nome" ? "" : order}>
            <option value="">Ordem alfabética</option>
            <option value="admissao">Admissão mais recente</option>
          </select>
          <noscript>
            <button className="btn btn--sm" type="submit">
              Filtrar
            </button>
          </noscript>
        </FilterForm>

        {rows.length ? (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Cargo</th>
                  <th scope="col">Departamento</th>
                  <th scope="col">Gestor</th>
                  <th scope="col">Admissão</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="has-link">
                    <td className="cell-main">
                      <span className="cell-person">
                        <Avatar name={r.name} photoId={r.photo} />
                        <span>
                          <Link href={`/rh/funcionarios/${r.id}`} className="row-link">
                            {r.name}
                          </Link>
                          <small>{r.email}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Cargo">
                      {r.position}
                      {r.type !== "CLT" ? <span className="subtle"> · {EMPLOYMENT_LABEL[r.type]}</span> : null}
                    </td>
                    <td data-label="Departamento">{r.department}</td>
                    <td data-label="Gestor">{r.manager ?? <span className="subtle">—</span>}</td>
                    <td data-label="Admissão" className="tabular nowrap">
                      {fmtDate(r.hiredAt)}
                    </td>
                    <td data-label="Situação">
                      <Badge status={r.status}>{EMPLOYEE_STATUS_LABEL[r.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Users} title="Ninguém encontrado" action={q || dep ? <Link href="/rh/funcionarios" className="btn btn--outline btn--sm">Limpar filtros</Link> : undefined}>
            Ajuste a busca ou os filtros.
          </Empty>
        )}
        {pages > 1 ? (
          <nav className="panel__foot row between" aria-label="Paginação">
            <span className="subtle">
              Página {page} de {pages}
            </span>
            <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
              {page > 1 ? (
                <Link className="btn btn--outline btn--sm" href={`/rh/funcionarios${qs(page - 1)}`}>
                  Anterior
                </Link>
              ) : null}
              {page < pages ? (
                <Link className="btn btn--outline btn--sm" href={`/rh/funcionarios${qs(page + 1)}`}>
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
