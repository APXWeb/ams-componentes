import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Archive, Mail, MailCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/rh/ui";
import { Badge, Empty } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Mensagens do site" };

async function setStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  "use server";
  const user = await requireUser("messages.view");
  const id = Number(fd.get("id"));
  const status = String(fd.get("status"));
  if (!["RESPONDIDA", "ARQUIVADA", "NOVA"].includes(status)) return fail("Situação inválida.");
  db.update(schema.contactMessages).set({ status: status as "NOVA" | "RESPONDIDA" | "ARQUIVADA" }).where(eq(schema.contactMessages.id, id)).run();
  await audit(user, "EDICAO", `Mensagem do site #${id} marcada como ${status.toLowerCase()}`, { type: "contact", id });
  revalidatePath("/rh/mensagens");
  return done("Mensagem atualizada.");
}

const LABEL = { NOVA: "Nova", RESPONDIDA: "Respondida", ARQUIVADA: "Arquivada" } as const;

export default async function MensagensPage() {
  await requireUser("messages.view");
  const rows = db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.createdAt)).limit(200).all();
  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader eyebrow="Administração" title="Mensagens do site" description="Contatos enviados pelo formulário público. Responda pelo e-mail do remetente e marque como respondida." />
      <section className="panel">
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
                    <ActionModal trigger={<><MailCheck aria-hidden /> Respondida</>} triggerClass="btn btn--ghost btn--sm" title="Marcar como respondida" action={setStatus} submitLabel="Confirmar" hidden={{ id: m.id, status: "RESPONDIDA" }} />
                  ) : null}
                  {m.status !== "ARQUIVADA" ? (
                    <ActionModal trigger={<Archive aria-hidden />} triggerClass="btn btn--ghost btn--sm btn--icon" title="Arquivar mensagem" action={setStatus} submitLabel="Arquivar" hidden={{ id: m.id, status: "ARQUIVADA" }} />
                  ) : null}
                </span>
              </div>
            </article>
          ))
        ) : (
          <Empty icon={Mail} title="Nenhuma mensagem recebida" />
        )}
      </section>
    </div>
  );
}
