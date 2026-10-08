"use client";

import Link from "next/link";
import { CheckCircle2, FilePlus2, FileText, Trash2, Upload, XCircle, FileQuestion } from "lucide-react";
import { ActionModal } from "@/components/ui/modal";
import { FileDrop, SelectField, TextAreaField, TextField } from "@/components/ui/form";
import { Badge, Empty } from "@/components/ui/bits";
import { DOC_CATEGORY_LABEL, DOC_STATUS_LABEL } from "@/lib/labels";
import { fmtBytes, fmtDate, todayISO } from "@/lib/format";
import { ACCEPT_DOCS } from "@/lib/demo/actions/util";
import { deleteDocument, requestDocument, reviewDocument, uploadDocument } from "@/lib/demo/actions/documents";
import type { DocCategory, DocumentRow } from "@/lib/demo/types";
import { DocumentPreview } from "./document-viewer";

export type DocRow = DocumentRow & { employeeName?: string };

const CATEGORY_OPTIONS = (Object.keys(DOC_CATEGORY_LABEL) as DocCategory[]).filter((c) => c !== "CURRICULO").map((c) => ({ value: c, label: DOC_CATEGORY_LABEL[c] }));

/** Tabela de documentos com ações conforme o perfil (RH valida, recusa e exclui; funcionário envia). */
export function DocumentTable({ docs, hr, canUpload, showEmployee }: { docs: DocRow[]; hr: boolean; canUpload: boolean; showEmployee?: boolean }) {
  if (!docs.length) {
    return (
      <Empty icon={FileText} title="Nenhum documento">
        {hr ? "Envie um arquivo ou crie uma pendência para o funcionário." : "Quando o RH pedir um documento, ele aparece aqui."}
      </Empty>
    );
  }
  const today = todayISO();
  return (
    <div className="table-wrap">
      <table className="table table--stack">
        <thead>
          <tr>
            <th scope="col">Documento</th>
            {showEmployee ? <th scope="col">Funcionário</th> : null}
            <th scope="col">Categoria</th>
            <th scope="col">Situação</th>
            <th scope="col">Data</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => {
            const late = d.status === "PENDENTE" && d.dueDate && d.dueDate < today;
            return (
              <tr key={d.id}>
                <td className="cell-main">
                  <span className="cell-person">
                    <span className="avatar avatar--sm" style={{ borderRadius: 4, background: d.storageKey ? "var(--navy-50)" : "var(--warning-bg)", color: d.storageKey ? "var(--navy-600)" : "var(--warning)" }} aria-hidden>
                      {d.storageKey ? <FileText size={14} /> : <FileQuestion size={14} />}
                    </span>
                    <span>
                      <b>{d.title}</b>
                      <small>
                        {d.storageKey ? fmtBytes(d.sizeBytes) : "Aguardando envio"}
                        {d.note && d.status !== "VALIDADO" ? ` · ${d.note}` : ""}
                      </small>
                    </span>
                  </span>
                </td>
                {showEmployee ? (
                  <td data-label="Funcionário">
                    {d.employeeId ? (
                      <Link className="link" href={`/rh/funcionarios/${d.employeeId}?aba=documentos`}>
                        {d.employeeName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                ) : null}
                <td data-label="Categoria">{DOC_CATEGORY_LABEL[d.category]}</td>
                <td data-label="Situação">
                  <Badge status={late ? "RECUSADO" : d.status}>{late ? "Atrasado" : DOC_STATUS_LABEL[d.status]}</Badge>
                </td>
                <td data-label="Data" className="nowrap tabular subtle">
                  {d.storageKey ? fmtDate(d.uploadedAt) : d.dueDate ? `Prazo ${fmtDate(d.dueDate)}` : "—"}
                </td>
                <td>
                  <div className="row" style={{ "--gap": "4px", justifyContent: "flex-end" } as React.CSSProperties}>
                    {d.storageKey ? <DocumentPreview doc={d} /> : null}
                    {(d.status === "PENDENTE" || d.status === "RECUSADO") && canUpload ? (
                      <ActionModal
                        trigger={
                          <>
                            <Upload aria-hidden /> Enviar
                          </>
                        }
                        triggerClass="btn btn--sm"
                        title={`Enviar: ${d.title}`}
                        description={d.note ?? undefined}
                        action={uploadDocument}
                        submitLabel="Enviar arquivo"
                        hidden={{ documentId: d.id }}
                      >
                        <FileDrop name="file" accept={ACCEPT_DOCS} label="Arquivo" help="PDF, DOCX, JPG, PNG ou WEBP, até 8 MB" required />
                      </ActionModal>
                    ) : null}
                    {hr && d.status === "ENVIADO" ? (
                      <>
                        <ActionModal
                          trigger={
                            <>
                              <CheckCircle2 aria-hidden /> Validar
                            </>
                          }
                          triggerClass="btn btn--sm"
                          title="Validar documento"
                          description={`Confirma que "${d.title}" está correto e legível?`}
                          action={reviewDocument}
                          submitLabel="Validar"
                          hidden={{ id: d.id, decision: "VALIDADO" }}
                        />
                        <ActionModal
                          trigger={<XCircle aria-hidden />}
                          triggerClass="btn btn--danger-outline btn--sm btn--icon"
                          title="Recusar documento"
                          description="O funcionário verá o motivo e poderá enviar novamente."
                          action={reviewDocument}
                          submitLabel="Recusar"
                          submitClass="btn btn--danger"
                          hidden={{ id: d.id, decision: "RECUSADO" }}
                        >
                          <TextAreaField label="Motivo" name="note" rows={3} placeholder="Ex.: arquivo ilegível, documento vencido" />
                        </ActionModal>
                      </>
                    ) : null}
                    {hr ? (
                      <ActionModal
                        trigger={<Trash2 aria-hidden />}
                        triggerClass="btn btn--ghost btn--sm btn--icon"
                        title="Excluir documento"
                        description={`"${d.title}" será removido do cadastro. A exclusão fica registrada na auditoria.`}
                        action={deleteDocument}
                        submitLabel="Excluir"
                        submitClass="btn btn--danger"
                        hidden={{ id: d.id }}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Botões do RH para criar pendência ou anexar arquivo a um funcionário. */
export function DocumentHrActions({ employees, employeeId }: { employees?: { value: number; label: string }[]; employeeId?: number }) {
  const pick = employeeId ? null : <SelectField label="Funcionário" name="employeeId" placeholder="Selecione" options={employees ?? []} defaultValue="" />;
  return (
    <>
      <ActionModal
        trigger={
          <>
            <FilePlus2 aria-hidden /> Pedir documento
          </>
        }
        triggerClass="btn btn--outline"
        title="Pedir documento ao funcionário"
        description="Cria uma pendência que aparece no painel do funcionário."
        action={requestDocument}
        submitLabel="Criar pendência"
        hidden={employeeId ? { employeeId } : undefined}
      >
        {pick}
        <SelectField label="Categoria" name="category" placeholder="Selecione" options={CATEGORY_OPTIONS} defaultValue="" />
        <TextField label="Documento" name="title" placeholder="Ex.: Certificado NR-12" />
        <TextField label="Prazo" name="dueDate" type="date" optional />
        <TextAreaField label="Orientação" name="note" optional rows={2} placeholder="Ex.: enviar em PDF ou foto legível" />
      </ActionModal>
      <ActionModal
        trigger={
          <>
            <Upload aria-hidden /> Enviar arquivo
          </>
        }
        triggerClass="btn"
        title="Enviar documento"
        description="O arquivo fica no cadastro do funcionário e só é acessível dentro do sistema."
        action={uploadDocument}
        submitLabel="Salvar documento"
        hidden={employeeId ? { employeeId } : undefined}
      >
        {pick}
        <SelectField label="Categoria" name="category" placeholder="Selecione" options={CATEGORY_OPTIONS} defaultValue="" />
        <TextField label="Nome do documento" name="title" placeholder="Ex.: Contrato de trabalho" />
        <FileDrop name="file" accept={ACCEPT_DOCS} label="Arquivo" help="PDF, DOCX, JPG, PNG ou WEBP, até 8 MB" required />
      </ActionModal>
    </>
  );
}

/** Envio pelo próprio funcionário. */
export function DocumentSelfUpload() {
  return (
    <ActionModal
      trigger={
        <>
          <Upload aria-hidden /> Enviar documento
        </>
      }
      triggerClass="btn"
      title="Enviar documento ao RH"
      description="Use para atestados, certificados e comprovantes. O RH valida o arquivo."
      action={uploadDocument}
      submitLabel="Enviar"
    >
      <SelectField label="Categoria" name="category" placeholder="Selecione" options={CATEGORY_OPTIONS} defaultValue="" />
      <TextField label="Nome do documento" name="title" placeholder="Ex.: Atestado médico de 12/10" />
      <FileDrop name="file" accept={ACCEPT_DOCS} label="Arquivo" help="PDF, DOCX, JPG, PNG ou WEBP, até 8 MB" required />
    </ActionModal>
  );
}
