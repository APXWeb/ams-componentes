"use client";

import { useSearchParams } from "next/navigation";
import { FileText, FileWarning, FileClock, FileCheck2, Search } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageHeader, Kpi } from "@/components/rh/ui";
import { FilterForm } from "@/components/rh/filter-form";
import { Panel } from "@/components/ui/bits";
import { DocumentHrActions, DocumentSelfUpload, DocumentTable, type DocRow } from "@/components/rh/documents";
import { useRh } from "@/components/rh/demo-app";
import { activeEmployeeOptions, employee, matches } from "@/lib/demo/queries";
import { DOC_CATEGORIES } from "@/lib/demo/types";
import { DOC_CATEGORY_LABEL } from "@/lib/labels";

const ORDER = { PENDENTE: 0, RECUSADO: 1, ENVIADO: 2, VALIDADO: 3 };

export function DocumentosView() {
  const { d, user } = useRh();
  const sp = useSearchParams();
  const hr = can(user.role, "documents.manage");
  const str = (k: string) => sp.get(k) ?? "";

  if (!hr) {
    if (!user.employeeId) return <PageHeader title="Documentos" description="Seu usuário não está vinculado a um cadastro de funcionário." />;
    const docs = d.documents.filter((x) => x.employeeId === user.employeeId).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.localeCompare(a.createdAt));
    const pend = docs.filter((x) => x.status === "PENDENTE" || x.status === "RECUSADO").length;
    return (
      <>
        <PageHeader eyebrow="Meu espaço" title="Meus documentos" description="Holerites, contratos e comprovantes. Só você e o RH têm acesso." actions={<DocumentSelfUpload />} />
        {pend ? (
          <div className="notice notice--warning" style={{ marginBottom: 16 }}>
            <FileWarning aria-hidden />
            <span>
              O RH aguarda {pend} {pend === 1 ? "documento seu" : "documentos seus"}. Use o botão Enviar na linha correspondente.
            </span>
          </div>
        ) : null}
        <section className="panel">
          <DocumentTable docs={docs} hr={false} canUpload />
        </section>
      </>
    );
  }

  const status = str("status");
  const cat = str("categoria");
  const q = str("q").slice(0, 60);
  const withEmp = d.documents.filter((x) => x.employeeId).map((x): DocRow => ({ ...x, employeeName: employee(d, x.employeeId)?.name }));
  const rows = withEmp
    .filter((x) => (status === "pendentes" ? x.status === "PENDENTE" || x.status === "ENVIADO" || x.status === "RECUSADO" : status ? x.status === status : true))
    .filter((x) => !cat || x.category === cat)
    .filter((x) => matches(q, x.title, x.employeeName))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200);
  const c = (s: DocRow["status"]) => withEmp.filter((x) => x.status === s).length;

  return (
    <>
      <PageHeader eyebrow="Gestão" title="Documentos" description="Pendências, validação e arquivo de documentos dos colaboradores." actions={<DocumentHrActions employees={activeEmployeeOptions(d)} />} />
      <div className="kpis">
        <Kpi icon={FileWarning} label="Aguardando envio" value={c("PENDENTE")} href="/rh/documentos?status=PENDENTE" />
        <Kpi icon={FileClock} label="Aguardando validação" value={c("ENVIADO")} href="/rh/documentos?status=ENVIADO" alert={c("ENVIADO") > 0} />
        <Kpi icon={FileText} label="Recusados" value={c("RECUSADO")} href="/rh/documentos?status=RECUSADO" />
        <Kpi icon={FileCheck2} label="Validados" value={c("VALIDADO")} href="/rh/documentos?status=VALIDADO" />
      </div>
      <Panel bodyClass="">
        <FilterForm>
          <div className="input-icon">
            <Search aria-hidden />
            <label htmlFor="q" className="sr-only">
              Buscar
            </label>
            <input id="q" name="q" type="search" className="input input--sm" placeholder="Documento ou colaborador" defaultValue={q} />
          </div>
          <label htmlFor="status" className="sr-only">
            Situação
          </label>
          <select id="status" name="status" className="select select--sm" defaultValue={status} key={`st-${status}`}>
            <option value="">Todas as situações</option>
            <option value="pendentes">Com pendência</option>
            <option value="PENDENTE">Aguardando envio</option>
            <option value="ENVIADO">Aguardando validação</option>
            <option value="RECUSADO">Recusados</option>
            <option value="VALIDADO">Validados</option>
          </select>
          <label htmlFor="categoria" className="sr-only">
            Categoria
          </label>
          <select id="categoria" name="categoria" className="select select--sm" defaultValue={cat}>
            <option value="">Todas as categorias</option>
            {DOC_CATEGORIES.map((x) => (
              <option key={x} value={x}>
                {DOC_CATEGORY_LABEL[x]}
              </option>
            ))}
          </select>
        </FilterForm>
        <div className="tab-panel" key={`${status}-${cat}-${q}`}>
          <DocumentTable docs={rows} hr canUpload showEmployee />
        </div>
        {rows.length === 200 ? <p className="panel__foot xsmall subtle">Mostrando os 200 documentos mais relevantes. Use a busca ou os filtros para refinar.</p> : null}
      </Panel>
    </>
  );
}
