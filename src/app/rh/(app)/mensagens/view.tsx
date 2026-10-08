"use client";

import { useState } from "react";
import { Archive, Mail, MailCheck } from "lucide-react";
import { PageHeader } from "@/components/rh/ui";
import { Badge, Empty } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { Guard, useRh } from "@/components/rh/demo-app";
import { setMessageStatus } from "@/lib/demo/actions/admin";
import { fmtDateTime } from "@/lib/format";

const LABEL = { NOVA: "Nova", RESPONDIDA: "Respondida", ARQUIVADA: "Arquivada" } as const;
const FILTERS = [
  { id: "", label: "Todas" },
  { id: "NOVA", label: "Novas" },
  { id: "RESPONDIDA", label: "Respondidas" },
  { id: "ARQUIVADA", label: "Arquivadas" },
] as const;

export function MensagensView() {
  return (
    <Guard anyOf={["messages.view"]}>
      <Mensagens />
    </Guard>
  );
}

function Mensagens() {
  const { d } = useRh();
  const [filter, setFilter] = useState("");
  const rows = [...d.contactMessages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((m) => !filter || m.status === filter);
  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader eyebrow="Administração" title="Mensagens do site" description="Contatos enviados pelo formulário público. Responda pelo e-mail do remetente e marque como respondida." />
      <nav className="seg" aria-label="Filtrar mensagens" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
            {f.id ? <span className="mono subtle"> {d.contactMessages.filter((m) => m.status === f.id).length}</span> : null}
          </button>
        ))}
      </nav>
      <section className="panel tab-panel" key={filter}>
        {rows.length ? (
          rows.map((m) => (
            <article key={m.id} className={`ann ${m.status === "NOVA" ? "is-unread" : ""}`}>
              <div className="row between wrap">
                <h2 className="ann__title" style={{ fontFamily: "var(--font-body)", fontSize: "var(--fs-base)" }}>
                  {m.subject} · {m.name}
                </h2>
                <Badge tone={m.status === "NOVA" ? "info" : m.status === "RESPONDIDA" ? "success" : "neutral"}>{LABEL[m.status]}</Badge>
              </div>
              <p className="ann__body">{m.message}</p>
              <div className="row wrap xsmall subtle" style={{ "--gap": "14px", marginTop: 10 } as React.CSSProperties}>
                <span>{fmtDateTime(m.createdAt)}</span>
                <a className="link" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>
                  {m.email}
                </a>
                {m.phone ? <span>{m.phone}</span> : null}
                {m.city ? <span>{m.city}</span> : null}
                <span className="row" style={{ marginLeft: "auto", "--gap": "4px" } as React.CSSProperties}>
                  {m.status !== "RESPONDIDA" ? (
                    <ActionModal trigger={<><MailCheck aria-hidden /> Respondida</>} triggerClass="btn btn--ghost btn--sm" title="Marcar como respondida" description="Use depois de responder pelo seu e-mail." action={setMessageStatus} submitLabel="Confirmar" hidden={{ id: m.id, status: "RESPONDIDA" }} />
                  ) : null}
                  {m.status !== "ARQUIVADA" ? (
                    <ActionModal trigger={<Archive aria-hidden />} triggerClass="btn btn--ghost btn--sm btn--icon" title="Arquivar mensagem" action={setMessageStatus} submitLabel="Arquivar" hidden={{ id: m.id, status: "ARQUIVADA" }} />
                  ) : null}
                </span>
              </div>
            </article>
          ))
        ) : (
          <Empty icon={Mail} title={filter ? "Nenhuma mensagem nesta situação" : "Nenhuma mensagem recebida"} />
        )}
      </section>
    </div>
  );
}
