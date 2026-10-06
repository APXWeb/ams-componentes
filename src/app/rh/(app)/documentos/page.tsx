import type { Metadata } from "next";
import { and, count, desc, eq, inArray, isNotNull, like, ne, or, type SQL } from "drizzle-orm";
import { FileText, FileWarning, FileClock, FileCheck2, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { DOC_CATEGORIES, type DocCategory } from "@/db/schema";
import { PageHeader, Kpi } from "@/components/rh/ui";
import { FilterForm } from "@/components/rh/filter-form";
import { Panel } from "@/components/ui/bits";
import { DocumentHrActions, DocumentSelfUpload, DocumentTable, type DocRow } from "@/components/rh/documents";
import { activeEmployeeOptions } from "@/lib/rh-options";
import { DOC_CATEGORY_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentosPage({ searchParams }: PageProps<"/rh/documentos">) {
  const user = await requireUser();
  const hr = can(user.role, "documents.manage");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  if (!hr) {
    if (!user.employeeId) return <PageHeader title="Documentos" description="Seu usuário não está vinculado a um cadastro de funcionário." />;
    const docs = db
      .select()
      .from(schema.documents)
      .innerJoin(schema.employees, eq(schema.employees.id, schema.documents.employeeId))
      .where(and(eq(schema.documents.employeeId, user.employeeId), or(isNotNull(schema.documents.storageKey), ne(schema.documents.status, "VALIDADO"))))
      .orderBy(desc(schema.documents.createdAt))
      .all()
      .filter((r) => r.employees.photoDocumentId !== r.documents.id)
      .map((r) => r.documents);
    const order = { PENDENTE: 0, RECUSADO: 1, ENVIADO: 2, VALIDADO: 3 };
    docs.sort((a, b) => order[a.status] - order[b.status]);
    const pend = docs.filter((d) => d.status === "PENDENTE" || d.status === "RECUSADO").length;
    return (
      <>
        <PageHeader eyebrow="Meu espaço" title="Meus documentos" description="Arquivos privados: só você e o RH têm acesso." actions={<DocumentSelfUpload />} />
        {pend ? (
          <div className="notice notice--warning" style={{ marginBottom: 16 }}>
            <FileWarning aria-hidden />
            <span>
              O RH aguarda {pend} {pend === 1 ? "documento" : "documentos"} seu(s). Use o botão Enviar na linha correspondente.
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
  const where: SQL | undefined = and(
    isNotNull(schema.documents.employeeId),
    status === "pendentes" ? inArray(schema.documents.status, ["PENDENTE", "ENVIADO", "RECUSADO"]) : status ? eq(schema.documents.status, status as DocRow["status"]) : undefined,
    DOC_CATEGORIES.includes(cat as DocCategory) ? eq(schema.documents.category, cat as DocCategory) : undefined,
    q ? or(like(schema.documents.title, `%${q}%`), like(schema.employees.name, `%${q}%`)) : undefined,
  );
  const rows: DocRow[] = db
    .select({ d: schema.documents, employeeName: schema.employees.name, photo: schema.employees.photoDocumentId })
    .from(schema.documents)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.documents.employeeId))
    .where(where)
    .orderBy(desc(schema.documents.createdAt))
    .limit(200)
    .all()
    .filter((r) => r.photo !== r.d.id)
    .map((r) => ({ ...r.d, employeeName: r.employeeName }));
  const c = (s: DocRow["status"][]) => db.select({ n: count() }).from(schema.documents).where(and(isNotNull(schema.documents.employeeId), inArray(schema.documents.status, s))).get()!.n;

  return (
    <>
      <PageHeader eyebrow="Gestão" title="Documentos" description="Pendências, validação e arquivo de documentos dos colaboradores." actions={<DocumentHrActions employees={activeEmployeeOptions()} />} />
      <div className="kpis">
        <Kpi icon={FileWarning} label="Aguardando envio" value={c(["PENDENTE"])} href="/rh/documentos?status=PENDENTE" />
        <Kpi icon={FileClock} label="Aguardando validação" value={c(["ENVIADO"])} href="/rh/documentos?status=ENVIADO" alert={c(["ENVIADO"]) > 0} />
        <Kpi icon={FileText} label="Recusados" value={c(["RECUSADO"])} href="/rh/documentos?status=RECUSADO" />
        <Kpi icon={FileCheck2} label="Validados" value={c(["VALIDADO"])} href="/rh/documentos?status=VALIDADO" />
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
          <select id="status" name="status" className="select select--sm" defaultValue={status}>
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
            {DOC_CATEGORIES.map((d) => (
              <option key={d} value={d}>
                {DOC_CATEGORY_LABEL[d]}
              </option>
            ))}
          </select>
        </FilterForm>
        <DocumentTable docs={rows} hr canUpload showEmployee />
      </Panel>
    </>
  );
}
