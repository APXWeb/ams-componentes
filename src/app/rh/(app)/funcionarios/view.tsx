"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, UserPlus, Users, Download } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/rh/ui";
import { FilterForm } from "@/components/rh/filter-form";
import { Avatar, Badge, Empty } from "@/components/ui/bits";
import { useToast } from "@/components/ui/toast";
import { Guard, useRh } from "@/components/rh/demo-app";
import { dept, employee, employeesScope, matches, position } from "@/lib/demo/queries";
import { EMPLOYEE_STATUS_LABEL, EMPLOYMENT_LABEL } from "@/lib/labels";
import { fmtDate } from "@/lib/format";

const PAGE = 25;

export function FuncionariosView() {
  return (
    <Guard anyOf={["employees.view_all", "employees.view_team"]}>
      <Lista />
    </Guard>
  );
}

function Lista() {
  const { d, user } = useRh();
  const sp = useSearchParams();
  const toast = useToast();
  const str = (k: string) => sp.get(k) ?? "";
  const q = str("q").slice(0, 60);
  const dep = Number(str("dep")) || 0;
  const dep0 = Number(str("dep")) || 0;
  const pos0 = Number(str("cargo")) || 0;
  // trocar de departamento descarta um cargo de outro departamento
  const pos = pos0 && (!dep0 || d.positions.find((p) => p.id === pos0)?.departmentId === dep0) ? pos0 : 0;
  const status = (["ATIVO", "AFASTADO", "DESLIGADO", "TODOS"] as const).find((s) => s === str("status")) ?? "ATIVOS";
  const order = str("ordem") === "admissao" ? "admissao" : "nome";
  const page = Math.max(1, Number(str("p")) || 1);
  const manageable = can(user.role, "employees.manage");
  const scope = employeesScope(user);

  const filtered = d.employees
    .filter(scope)
    .filter((e) => matches(q, e.name, e.corporateEmail, position(d, e.positionId)?.title))
    .filter((e) => !dep || e.departmentId === dep)
    .filter((e) => !pos || e.positionId === pos)
    .filter((e) => (status === "ATIVOS" ? e.status !== "DESLIGADO" : status === "TODOS" ? true : e.status === status))
    .sort((a, b) => (order === "admissao" ? b.hiredAt.localeCompare(a.hiredAt) : a.name.localeCompare(b.name)));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
  const departments = [...d.departments].sort((a, b) => a.name.localeCompare(b.name));
  const positions = d.positions.filter((p) => !dep || p.departmentId === dep).sort((a, b) => a.title.localeCompare(b.title));
  const qs = (p: number) => {
    const s = new URLSearchParams(sp);
    if (p > 1) s.set("p", String(p));
    else s.delete("p");
    return s.size ? `?${s}` : "";
  };

  const exportCsv = () => {
    const head = ["Nome", "E-mail corporativo", "Cargo", "Departamento", "Gestor", "Admissão", "Contratação", "Situação", "Cidade", "Telefone"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = filtered.map((e) =>
      [e.name, e.corporateEmail, position(d, e.positionId)?.title ?? "", dept(d, e.departmentId)?.name ?? "", employee(d, e.managerId)?.name ?? "", fmtDate(e.hiredAt), EMPLOYMENT_LABEL[e.employmentType], EMPLOYEE_STATUS_LABEL[e.status], e.city ?? "", e.phone ?? ""].map(esc).join(";"),
    );
    const blob = new Blob(["﻿" + [head.map(esc).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `funcionarios-ams-${new Date().toLocaleDateString("sv-SE")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`${filtered.length} funcionários exportados para CSV.`);
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
              <button type="button" className="btn btn--outline" onClick={exportCsv}>
                <Download aria-hidden /> Exportar CSV
              </button>
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
          {manageable ? (
            <>
              <label htmlFor="dep" className="sr-only">
                Departamento
              </label>
              <select id="dep" name="dep" className="select select--sm" defaultValue={dep || ""} key={`dep-${dep}`}>
                <option value="">Todos os departamentos</option>
                {departments.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <label htmlFor="cargo" className="sr-only">
            Cargo
          </label>
          <select id="cargo" name="cargo" className="select select--sm" defaultValue={pos || ""} key={`cargo-${dep}-${pos}`}>
            <option value="">Todos os cargos</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
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
        </FilterForm>

        {rows.length ? (
          <div className="table-wrap tab-panel" key={`${q}-${dep}-${pos}-${status}-${order}-${page}`}>
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
                        <Avatar name={r.name} photo={r.photo} />
                        <span>
                          <Link href={`/rh/funcionarios/${r.id}`} className="row-link">
                            {r.name}
                          </Link>
                          <small>{r.corporateEmail}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Cargo">
                      {position(d, r.positionId)?.title}
                      {r.employmentType !== "CLT" ? <span className="subtle"> · {EMPLOYMENT_LABEL[r.employmentType]}</span> : null}
                    </td>
                    <td data-label="Departamento">{dept(d, r.departmentId)?.name}</td>
                    <td data-label="Gestor">{employee(d, r.managerId)?.name ?? <span className="subtle">—</span>}</td>
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
          <Empty
            icon={Users}
            title="Ninguém encontrado"
            action={
              <Link href="/rh/funcionarios" className="btn btn--outline btn--sm">
                Limpar filtros
              </Link>
            }
          >
            Nenhuma pessoa corresponde à busca{q ? ` “${q}”` : ""} com os filtros escolhidos.
          </Empty>
        )}
        {pages > 1 ? (
          <nav className="panel__foot row between" aria-label="Paginação">
            <span className="subtle">
              {(page - 1) * PAGE + 1} a {Math.min(page * PAGE, total)} de {total} · página {page} de {pages}
            </span>
            <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
              {page > 1 ? (
                <Link className="btn btn--outline btn--sm" href={`/rh/funcionarios${qs(page - 1)}`} scroll={false}>
                  Anterior
                </Link>
              ) : null}
              {page < pages ? (
                <Link className="btn btn--outline btn--sm" href={`/rh/funcionarios${qs(page + 1)}`} scroll={false}>
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
