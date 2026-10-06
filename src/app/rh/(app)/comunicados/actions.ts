"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";

const annSchema = z
  .object({
    title: z.string().min(4, "Informe o título.").max(120),
    body: z.string().min(10, "Escreva a mensagem.").max(4000),
    priority: z.enum(["NORMAL", "IMPORTANTE", "URGENTE"]),
    audience: z.enum(["TODOS", "DEPARTAMENTO", "GESTORES"]),
    audienceDepartmentId: z.coerce.number().int().optional().transform((v) => (v ? v : null)),
    publishedAt: z.union([z.literal(""), z.iso.date()]).optional(),
    expiresAt: z.union([z.literal(""), z.iso.date()]).optional(),
  })
  .refine((v) => v.audience !== "DEPARTAMENTO" || v.audienceDepartmentId, { message: "Escolha o departamento.", path: ["audienceDepartmentId"] });

export async function createAnnouncement(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("announcements.manage");
  const parsed = annSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const publishedAt = v.publishedAt ? new Date(`${v.publishedAt}T08:00:00-03:00`).toISOString() : new Date().toISOString();
  const expiresAt = v.expiresAt ? new Date(`${v.expiresAt}T23:59:00-03:00`).toISOString() : null;
  if (expiresAt && expiresAt <= publishedAt) return fail("A data de expiração deve ser depois da publicação.", { expiresAt: "Data inválida." });
  const a = db
    .insert(schema.announcements)
    .values({ title: v.title, body: v.body, priority: v.priority, audience: v.audience, audienceDepartmentId: v.audience === "DEPARTAMENTO" ? v.audienceDepartmentId : null, publishedAt, expiresAt, authorUserId: user.id })
    .returning({ id: schema.announcements.id })
    .get();
  await audit(user, "PUBLICACAO", `Comunicado publicado: ${v.title}`, { type: "announcement", id: a.id });
  revalidatePath("/rh/comunicados");
  revalidatePath("/rh");
  return done(publishedAt > new Date().toISOString() ? "Comunicado agendado." : "Comunicado publicado.");
}

export async function deleteAnnouncement(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("announcements.manage");
  const id = Number(fd.get("id"));
  const a = db.select().from(schema.announcements).where(eq(schema.announcements.id, id)).get();
  if (!a) return fail("Comunicado não encontrado.");
  db.delete(schema.announcements).where(eq(schema.announcements.id, id)).run();
  await audit(user, "EXCLUSAO", `Comunicado removido: ${a.title}`, { type: "announcement", id });
  revalidatePath("/rh/comunicados");
  return done("Comunicado removido.");
}
