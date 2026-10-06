import type { Metadata } from "next";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { Megaphone, Trash2, Users, Building2, UserCog, Plus, Eye } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { visibleAnnouncementsWhere } from "@/lib/rh-scope";
import { PageHeader } from "@/components/rh/ui";
import { Badge, Empty } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form";
import { ANNOUNCEMENT_PRIORITY_LABEL } from "@/lib/labels";
import { fmtDate, fmtDateLong, relative } from "@/lib/format";
import { departmentOptions } from "@/lib/rh-options";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export const metadata: Metadata = { title: "Comunicados" };

export default async function ComunicadosPage() {
  const user = await requireUser();
  const manage = can(user.role, "announcements.manage");
  const rows = db
    .select({
      a: schema.announcements,
      dept: schema.departments.name,
      author: schema.users.name,
      read: schema.announcementReads.readAt,
    })
    .from(schema.announcements)
    .leftJoin(schema.departments, eq(schema.departments.id, schema.announcements.audienceDepartmentId))
    .leftJoin(schema.users, eq(schema.users.id, schema.announcements.authorUserId))
    .leftJoin(schema.announcementReads, and(eq(schema.announcementReads.announcementId, schema.announcements.id), eq(schema.announcementReads.userId, user.id)))
    .where(visibleAnnouncementsWhere(user))
    .orderBy(desc(schema.announcements.publishedAt))
    .all();
  const scheduled = manage
    ? db.select().from(schema.announcements).where(gt(schema.announcements.publishedAt, new Date().toISOString())).orderBy(schema.announcements.publishedAt).all()
    : [];
  const reads = manage
    ? db.select({ id: schema.announcementReads.announcementId, n: count() }).from(schema.announcementReads).groupBy(schema.announcementReads.announcementId).all()
    : [];

  // abrir a página marca os comunicados exibidos como lidos (o destaque de "novo" aparece nesta visita)
  const unread = rows.filter((r) => !r.read);
  if (unread.length) {
    const now = new Date().toISOString();
    db.insert(schema.announcementReads)
      .values(unread.map((r) => ({ announcementId: r.a.id, userId: user.id, readAt: now })))
      .onConflictDoNothing()
      .run();
  }

  const audienceLabel = (a: typeof schema.announcements.$inferSelect, dept: string | null) =>
    a.audience === "TODOS" ? "Todos" : a.audience === "GESTORES" ? "Gestores" : dept ?? "Departamento";

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
              <TextField label="Título" name="title" />
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
                <SelectField label="Departamento" name="audienceDepartmentId" optional placeholder="Quando o público for um departamento" options={departmentOptions()} defaultValue="" />
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
          <Megaphone aria-hidden />
          <span>
            {scheduled.length} {scheduled.length === 1 ? "comunicado agendado" : "comunicados agendados"}: {scheduled.map((s) => `${s.title} (${fmtDate(s.publishedAt)})`).join(", ")}.
          </span>
        </div>
      ) : null}

      <section className="panel">
        {rows.length ? (
          rows.map(({ a, dept, author, read }) => (
            <article key={a.id} className={`ann ann--${a.priority} ${read ? "" : "is-unread"}`} aria-label={a.title}>
              <div className="row between wrap" style={{ "--gap": "8px" } as React.CSSProperties}>
                <h2 className="ann__title" style={{ fontFamily: "var(--font-body)", fontSize: "var(--fs-md)" }}>
                  {a.title}
                </h2>
                <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
                  {a.priority !== "NORMAL" ? <Badge status={a.priority}>{ANNOUNCEMENT_PRIORITY_LABEL[a.priority]}</Badge> : null}
                  {!read ? <Badge tone="info">Novo</Badge> : null}
                </span>
              </div>
              <p className="ann__body">{a.body}</p>
              <div className="row wrap xsmall subtle" style={{ "--gap": "14px", marginTop: 10 } as React.CSSProperties}>
                <span title={fmtDateLong(a.publishedAt)}>{relative(a.publishedAt)}</span>
                {author ? <span>por {author}</span> : null}
                <span className="row" style={{ "--gap": "4px" } as React.CSSProperties}>
                  {a.audience === "TODOS" ? <Users size={13} aria-hidden /> : a.audience === "GESTORES" ? <UserCog size={13} aria-hidden /> : <Building2 size={13} aria-hidden />}
                  {audienceLabel(a, dept)}
                </span>
                {a.expiresAt ? <span>expira {fmtDate(a.expiresAt)}</span> : null}
                {manage ? (
                  <span className="row" style={{ "--gap": "4px" } as React.CSSProperties}>
                    <Eye size={13} aria-hidden /> {reads.find((r) => r.id === a.id)?.n ?? 0} leituras
                  </span>
                ) : null}
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
          ))
        ) : (
          <Empty icon={Megaphone} title="Nenhum comunicado no momento" />
        )}
      </section>
    </div>
  );
}
