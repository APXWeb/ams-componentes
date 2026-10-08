"use client";

import { useEffect, useState } from "react";
import { Megaphone, Trash2, Users, Building2, UserCog, Plus, Eye, CalendarDays } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/rh/ui";
import { Badge, Empty } from "@/components/ui/bits";
import { ActionModal, Modal } from "@/components/ui/modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form";
import { useRh } from "@/components/rh/demo-app";
import { departmentOptions, dept, isRead, userById, visibleAnnouncements } from "@/lib/demo/queries";
import { createAnnouncement, deleteAnnouncement, markAnnouncementsRead } from "@/lib/demo/actions/admin";
import { ANNOUNCEMENT_PRIORITY_LABEL } from "@/lib/labels";
import { fmtDate, fmtDateLong, relative } from "@/lib/format";
import type { Announcement, DemoData } from "@/lib/demo/types";

const FILTERS = [
  { id: "", label: "Todos" },
  { id: "URGENTE", label: "Urgentes" },
  { id: "IMPORTANTE", label: "Importantes" },
  { id: "NORMAL", label: "Informativos" },
] as const;

export function ComunicadosView() {
  const { d, user } = useRh();
  const manage = can(user.role, "announcements.manage");
  const rows = visibleAnnouncements(d, user);
  // o destaque de "novo" vale para esta visita; ao abrir a página, os exibidos ficam como lidos
  const [unreadAtOpen] = useState(() => rows.filter((a) => !isRead(d, a.id, user.id)).map((a) => a.id));
  const [filter, setFilter] = useState<string>("");
  const [open, setOpen] = useState<Announcement | null>(null);
  useEffect(() => {
    if (unreadAtOpen.length) markAnnouncementsRead(unreadAtOpen, user.id);
  }, [unreadAtOpen, user.id]);

  const scheduled = manage ? d.announcements.filter((a) => a.publishedAt > new Date().toISOString()) : [];
  const shown = rows.filter((a) => !filter || a.priority === filter);

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        eyebrow="Comunicação interna"
        title="Comunicados"
        description={manage ? "Publique avisos para toda a empresa, para um departamento ou só para gestores." : "Avisos do RH e da empresa."}
        actions={
          manage ? (
            <ActionModal
              trigger={
                <>
                  <Plus aria-hidden /> Novo comunicado
                </>
              }
              triggerClass="btn"
              title="Novo comunicado"
              action={createAnnouncement}
              submitLabel="Publicar"
              wide
            >
              <TextField label="Título" name="title" placeholder="Ex.: Parada programada da linha 2" />
              <TextAreaField label="Mensagem" name="body" rows={6} />
              <div className="grid grid-2">
                <SelectField
                  label="Prioridade"
                  name="priority"
                  defaultValue="NORMAL"
                  options={[
                    { value: "NORMAL", label: "Informativo" },
                    { value: "IMPORTANTE", label: "Importante" },
                    { value: "URGENTE", label: "Urgente" },
                  ]}
                />
                <SelectField
                  label="Público"
                  name="audience"
                  defaultValue="TODOS"
                  options={[
                    { value: "TODOS", label: "Todos os colaboradores" },
                    { value: "DEPARTAMENTO", label: "Um departamento" },
                    { value: "GESTORES", label: "Somente gestores" },
                  ]}
                />
                <SelectField label="Departamento" name="audienceDepartmentId" optional placeholder="Quando o público for um departamento" options={departmentOptions(d)} defaultValue="" />
                <span />
                <TextField label="Publicar em" name="publishedAt" type="date" optional hint="Vazio publica agora." />
                <TextField label="Expira em" name="expiresAt" type="date" optional />
              </div>
            </ActionModal>
          ) : null
        }
      />

      {scheduled.length ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          <CalendarDays aria-hidden />
          <span>
            {scheduled.length} {scheduled.length === 1 ? "comunicado agendado" : "comunicados agendados"}: {scheduled.map((s) => `${s.title} (${fmtDate(s.publishedAt)})`).join(", ")}.
          </span>
        </div>
      ) : null}

      <nav className="seg" aria-label="Filtrar comunicados" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
            {f.id ? <span className="mono subtle"> {rows.filter((a) => a.priority === f.id).length}</span> : null}
          </button>
        ))}
      </nav>

      <section className="panel tab-panel" key={filter}>
        {shown.length ? (
          shown.map((a) => {
            const fresh = unreadAtOpen.includes(a.id);
            return (
              <article key={a.id} className={`ann ann--${a.priority} ${fresh ? "is-unread" : ""}`} aria-label={a.title}>
                <div className="row between wrap" style={{ "--gap": "8px" } as React.CSSProperties}>
                  <h2 className="ann__title" style={{ fontFamily: "var(--font-body)", fontSize: "var(--fs-md)" }}>
                    <button type="button" className="ann__open" onClick={() => setOpen(a)}>
                      {a.title}
                    </button>
                  </h2>
                  <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
                    {a.priority !== "NORMAL" ? <Badge status={a.priority}>{ANNOUNCEMENT_PRIORITY_LABEL[a.priority]}</Badge> : null}
                    {fresh ? <Badge tone="info">Novo</Badge> : null}
                  </span>
                </div>
                <p className="ann__body">{a.body.length > 240 ? a.body.slice(0, 240) + "…" : a.body}</p>
                <div className="row wrap xsmall subtle" style={{ "--gap": "14px", marginTop: 10 } as React.CSSProperties}>
                  <span title={fmtDateLong(a.publishedAt)}>{relative(a.publishedAt)}</span>
                  <Audience d={d} a={a} />
                  {manage ? (
                    <span className="row" style={{ "--gap": "4px" } as React.CSSProperties}>
                      <Eye size={13} aria-hidden /> {reads(d, a)} leituras
                    </span>
                  ) : null}
                  <button type="button" className="link xsmall" onClick={() => setOpen(a)}>
                    Abrir comunicado
                  </button>
                  {manage ? (
                    <span style={{ marginLeft: "auto" }}>
                      <ActionModal
                        trigger={<Trash2 aria-hidden />}
                        triggerClass="btn btn--ghost btn--sm btn--icon"
                        title="Remover comunicado"
                        description={`"${a.title}" deixará de aparecer para todos.`}
                        action={deleteAnnouncement}
                        submitLabel="Remover"
                        submitClass="btn btn--danger"
                        hidden={{ id: a.id }}
                      />
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <Empty icon={Megaphone} title={filter ? "Nenhum comunicado com essa prioridade" : "Nenhum comunicado no momento"} />
        )}
      </section>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""} description={open ? `Publicado em ${fmtDateLong(open.publishedAt)}${open.authorUserId ? ` por ${userById(d, open.authorUserId)?.name}` : ""}` : undefined} wide>
        {open ? (
          <div className="modal__body">
            <div className="row wrap" style={{ "--gap": "8px" } as React.CSSProperties}>
              <Badge status={open.priority}>{ANNOUNCEMENT_PRIORITY_LABEL[open.priority]}</Badge>
              <span className="xsmall subtle row" style={{ "--gap": "4px" } as React.CSSProperties}>
                <Audience d={d} a={open} />
              </span>
            </div>
            <p className="pre-line" style={{ fontSize: "var(--fs-md)", lineHeight: 1.65 }}>
              {open.body}
            </p>
            {manage ? (
              <p className="xsmall subtle">
                {reads(d, open)} colaboradores leram este comunicado{open.expiresAt ? ` · expira em ${fmtDate(open.expiresAt)}` : ""}.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

const reads = (d: DemoData, a: Announcement) => a.baseReads + d.announcementReads.filter((r) => r.announcementId === a.id).length;

function Audience({ d, a }: { d: DemoData; a: Announcement }) {
  return (
    <span className="row" style={{ "--gap": "4px" } as React.CSSProperties}>
      {a.audience === "TODOS" ? <Users size={13} aria-hidden /> : a.audience === "GESTORES" ? <UserCog size={13} aria-hidden /> : <Building2 size={13} aria-hidden />}
      {a.audience === "TODOS" ? "Todos" : a.audience === "GESTORES" ? "Gestores" : dept(d, a.audienceDepartmentId)?.name ?? "Departamento"}
    </span>
  );
}
