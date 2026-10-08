"use client";

import { Plus } from "lucide-react";
import { ActionModal } from "@/components/ui/modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form";
import { PRIORITY_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { createRequest } from "@/lib/demo/actions/requests";

export function NewRequestButton({ open }: { open?: boolean }) {
  return (
    <ActionModal
      trigger={
        <>
          <Plus aria-hidden /> Nova solicitação
        </>
      }
      triggerClass="btn"
      title="Nova solicitação ao RH"
      description="Declarações, atualização cadastral, justificativas e outros pedidos. Para marcar férias, use a área Férias."
      action={createRequest}
      submitLabel="Enviar solicitação"
      autoOpen={open}
    >
      <div className="grid grid-2">
        <SelectField label="Tipo" name="type" placeholder="Selecione" options={Object.entries(REQUEST_TYPE_LABEL).map(([value, label]) => ({ value, label }))} defaultValue="" />
        <SelectField label="Prioridade" name="priority" defaultValue="MEDIA" options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))} />
      </div>
      <TextField label="Assunto" name="subject" placeholder="Ex.: Declaração de vínculo empregatício" />
      <TextAreaField label="Mensagem" name="message" rows={5} placeholder="Explique o que você precisa e, se houver, o prazo." />
    </ActionModal>
  );
}
