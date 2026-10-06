"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { DOC_CATEGORIES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { removeStored, saveUpload, UploadError } from "@/lib/storage";

const requestSchema = z.object({
  employeeId: z.coerce.number().int().positive("Escolha o funcionário."),
  category: z.enum(DOC_CATEGORIES, { message: "Escolha a categoria." }),
  title: z.string().min(3, "Descreva o documento.").max(120),
  dueDate: z.union([z.literal(""), z.iso.date()]).optional().transform((v) => v || null),
  note: z.string().max(400).optional().transform((v) => v || null),
});

/** RH pede um documento ao funcionário: cria uma pendência sem arquivo. */
export async function requestDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("documents.manage");
  const parsed = requestSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const emp = db.select({ name: schema.employees.name, status: schema.employees.status }).from(schema.employees).where(eq(schema.employees.id, v.employeeId)).get();
  if (!emp || emp.status === "DESLIGADO") return fail("Funcionário inválido.");
  const d = db
    .insert(schema.documents)
    .values({ ...v, status: "PENDENTE", requestedById: user.id })
    .returning({ id: schema.documents.id })
    .get();
  await audit(user, "CRIACAO", `Documento solicitado a ${emp.name}: ${v.title}`, { type: "document", id: d.id });
  revalidatePath("/rh/documentos");
  revalidatePath(`/rh/funcionarios/${v.employeeId}`);
  return done(`Pendência criada. ${emp.name.split(" ")[0]} verá o pedido no painel.`);
}

const uploadSchema = z.object({
  employeeId: z.coerce.number().int().positive().optional(),
  documentId: z.coerce.number().int().positive().optional(),
  category: z.enum(DOC_CATEGORIES).optional(),
  title: z.string().max(120).optional(),
});

/**
 * Envio de arquivo. Funcionário envia apenas para si (fica "aguardando validação");
 * RH pode enviar para qualquer funcionário (já entra validado).
 */
export async function uploadDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = uploadSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const isHr = can(user.role, "documents.manage");

  let target: typeof schema.documents.$inferSelect | undefined;
  let employeeId = v.employeeId ?? user.employeeId ?? undefined;
  if (v.documentId) {
    target = db.select().from(schema.documents).where(eq(schema.documents.id, v.documentId)).get();
    if (!target || !target.employeeId) return fail("Documento não encontrado.");
    employeeId = target.employeeId;
    if (!["PENDENTE", "RECUSADO"].includes(target.status)) return fail("Este documento já foi enviado.");
  }
  if (!employeeId) return fail("Escolha o funcionário.");
  if (!isHr && employeeId !== user.employeeId) return fail("Você só pode enviar documentos para o seu próprio cadastro.");
  if (!target && (!v.category || !v.title || v.title.length < 3)) {
    return fail("Informe a categoria e o nome do documento.", { ...(v.category ? {} : { category: "Escolha a categoria." }), ...(v.title && v.title.length >= 3 ? {} : { title: "Dê um nome ao documento." }) });
  }

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Selecione o arquivo.", { file: "Selecione o arquivo." });
  let stored;
  try {
    stored = await saveUpload(file, "docs");
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message, { file: e.message });
    throw e;
  }
  const now = new Date().toISOString();
  const status = isHr ? "VALIDADO" : "ENVIADO";
  let docId: number;
  if (target) {
    if (target.storageKey) await removeStored(target.storageKey);
    db.update(schema.documents)
      .set({ ...stored, status, uploadedById: user.id, uploadedAt: now, reviewedById: isHr ? user.id : null, reviewedAt: isHr ? now : null })
      .where(eq(schema.documents.id, target.id))
      .run();
    docId = target.id;
  } else {
    docId = db
      .insert(schema.documents)
      .values({ employeeId, category: v.category!, title: v.title!, ...stored, status, uploadedById: user.id, uploadedAt: now, reviewedById: isHr ? user.id : null, reviewedAt: isHr ? now : null })
      .returning({ id: schema.documents.id })
      .get().id;
  }
  await audit(user, "UPLOAD", `Documento enviado: ${target?.title ?? v.title}`, { type: "document", id: docId });
  revalidatePath("/rh/documentos");
  revalidatePath(`/rh/funcionarios/${employeeId}`);
  return done(isHr ? "Documento salvo no cadastro." : "Documento enviado. O RH vai validar em breve.");
}

const reviewSchema = z.object({
  id: z.coerce.number().int().positive(),
  decision: z.enum(["VALIDADO", "RECUSADO"]),
  note: z.string().max(400).optional(),
});

export async function reviewDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("documents.manage");
  const parsed = reviewSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, decision, note } = parsed.data;
  if (decision === "RECUSADO" && !note) return fail("Explique o motivo da recusa para o funcionário.", { note: "Informe o motivo." });
  const doc = db.select().from(schema.documents).where(and(eq(schema.documents.id, id), eq(schema.documents.status, "ENVIADO"))).get();
  if (!doc) return fail("Documento não está aguardando validação.");
  db.update(schema.documents)
    .set({ status: decision, note: note || doc.note, reviewedById: user.id, reviewedAt: new Date().toISOString() })
    .where(eq(schema.documents.id, id))
    .run();
  await audit(user, decision === "VALIDADO" ? "APROVACAO" : "RECUSA", `Documento ${decision === "VALIDADO" ? "validado" : "recusado"}: ${doc.title}`, { type: "document", id });
  revalidatePath("/rh/documentos");
  if (doc.employeeId) revalidatePath(`/rh/funcionarios/${doc.employeeId}`);
  return done(decision === "VALIDADO" ? "Documento validado." : "Documento recusado. O funcionário verá o motivo.");
}

export async function deleteDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("documents.manage");
  const id = Number(fd.get("id"));
  const doc = db.select().from(schema.documents).where(eq(schema.documents.id, id)).get();
  if (!doc || !doc.employeeId) return fail("Documento não encontrado.");
  const emp = db.select({ photo: schema.employees.photoDocumentId }).from(schema.employees).where(eq(schema.employees.id, doc.employeeId)).get();
  if (emp?.photo === id) db.update(schema.employees).set({ photoDocumentId: null }).where(eq(schema.employees.id, doc.employeeId)).run();
  db.delete(schema.documents).where(eq(schema.documents.id, id)).run();
  if (doc.storageKey) await removeStored(doc.storageKey);
  await audit(user, "EXCLUSAO", `Documento excluído: ${doc.title}`, { type: "document", id });
  revalidatePath("/rh/documentos");
  revalidatePath(`/rh/funcionarios/${doc.employeeId}`);
  return done("Documento excluído.");
}
