import { z } from "zod";
import { can } from "@/lib/permissions";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { getData, latency, mutate, nextId } from "../store";
import { audit } from "../audit";
import { DOC_CATEGORIES, type DocumentRow } from "../types";
import { authorize, checkFile, keepFile, nowIso } from "./util";

const requestSchema = z.object({
  employeeId: z.coerce.number({ message: "Escolha o funcionário." }).int().positive("Escolha o funcionário."),
  category: z.enum(DOC_CATEGORIES, { message: "Escolha a categoria." }),
  title: z.string().min(3, "Descreva o documento.").max(120),
  dueDate: z.union([z.literal(""), z.iso.date()]).optional().transform((v) => v || null),
  note: z.string().max(400).optional().transform((v) => v || null),
});

const blank = (now: string): Omit<DocumentRow, "id" | "employeeId" | "category" | "title" | "status"> => ({
  applicationId: null,
  storageKey: null,
  originalName: null,
  mimeType: null,
  sizeBytes: null,
  dueDate: null,
  note: null,
  requestedById: null,
  uploadedById: null,
  uploadedAt: null,
  reviewedById: null,
  reviewedAt: null,
  createdAt: now,
});

/** RH pede um documento ao funcionário: cria uma pendência sem arquivo. */
export async function requestDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("documents.manage");
  if (denied) return denied;
  const parsed = requestSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const emp = getData().employees.find((e) => e.id === v.employeeId);
  if (!emp || emp.status === "DESLIGADO") return fail("Funcionário inválido.");
  await latency();
  mutate((d) => {
    const id = nextId(d, "documents");
    d.documents.push({ ...blank(nowIso()), id, employeeId: v.employeeId, category: v.category, title: v.title, status: "PENDENTE", dueDate: v.dueDate, note: v.note, requestedById: user.id });
    audit(d, user, "CRIACAO", `Documento solicitado a ${emp.name}: ${v.title}`, { type: "document", id });
  });
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
 * RH pode enviar para qualquer funcionário (já entra validado). O arquivo não sai do navegador.
 */
export async function uploadDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = authorize();
  const raw = formObject(fd);
  const parsed = uploadSchema.safeParse({ ...raw, category: raw.category || undefined, employeeId: raw.employeeId || undefined });
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const isHr = can(user.role, "documents.manage");
  const d0 = getData();
  let employeeId = v.employeeId ?? user.employeeId ?? undefined;
  const target = v.documentId ? d0.documents.find((x) => x.id === v.documentId) : undefined;
  if (v.documentId) {
    if (!target || !target.employeeId) return fail("Documento não encontrado.");
    employeeId = target.employeeId;
    if (!["PENDENTE", "RECUSADO"].includes(target.status)) return fail("Este documento já foi enviado.");
  }
  if (!employeeId) return fail("Escolha o funcionário.", { employeeId: "Escolha o funcionário." });
  if (!isHr && employeeId !== user.employeeId) return fail("Você só pode enviar documentos para o seu próprio cadastro.");
  if (!target && (!v.category || !v.title || v.title.length < 3)) {
    return fail("Informe a categoria e o nome do documento.", { ...(v.category ? {} : { category: "Escolha a categoria." }), ...(v.title && v.title.length >= 3 ? {} : { title: "Dê um nome ao documento." }) });
  }
  const checked = checkFile(fd.get("file"), "docs");
  if ("error" in checked) return fail(checked.error, { file: checked.error });
  await latency(600, 1000);
  const stored = keepFile(checked.file);
  const status = isHr ? "VALIDADO" : "ENVIADO";
  mutate((d) => {
    const now = nowIso();
    const review = { reviewedById: isHr ? user.id : null, reviewedAt: isHr ? now : null };
    let docId: number;
    if (target) {
      const x = d.documents.find((y) => y.id === target.id)!;
      Object.assign(x, stored, { status, uploadedById: user.id, uploadedAt: now }, review);
      docId = x.id;
    } else {
      docId = nextId(d, "documents");
      d.documents.push({ ...blank(now), id: docId, employeeId: employeeId!, category: v.category!, title: v.title!, ...stored, status, uploadedById: user.id, uploadedAt: now, ...review });
    }
    audit(d, user, "UPLOAD", `Documento enviado: ${target?.title ?? v.title}`, { type: "document", id: docId });
  });
  return done(isHr ? "Documento salvo no cadastro." : "Documento enviado. O RH vai validar em breve.");
}

const reviewSchema = z.object({
  id: z.coerce.number().int().positive(),
  decision: z.enum(["VALIDADO", "RECUSADO"]),
  note: z.string().max(400).optional(),
});

export async function reviewDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("documents.manage");
  if (denied) return denied;
  const parsed = reviewSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, decision, note } = parsed.data;
  if (decision === "RECUSADO" && !note) return fail("Explique o motivo da recusa para o funcionário.", { note: "Informe o motivo." });
  const doc = getData().documents.find((x) => x.id === id && x.status === "ENVIADO");
  if (!doc) return fail("Documento não está aguardando validação.");
  await latency();
  mutate((d) => {
    Object.assign(d.documents.find((x) => x.id === id)!, { status: decision, note: note || doc.note, reviewedById: user.id, reviewedAt: nowIso() });
    audit(d, user, decision === "VALIDADO" ? "APROVACAO" : "RECUSA", `Documento ${decision === "VALIDADO" ? "validado" : "recusado"}: ${doc.title}`, { type: "document", id });
  });
  return done(decision === "VALIDADO" ? "Documento validado." : "Documento recusado. O funcionário verá o motivo.");
}

export async function deleteDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("documents.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const doc = getData().documents.find((x) => x.id === id);
  if (!doc || !doc.employeeId) return fail("Documento não encontrado.");
  await latency();
  mutate((d) => {
    d.documents = d.documents.filter((x) => x.id !== id);
    audit(d, user, "EXCLUSAO", `Documento excluído: ${doc.title}`, { type: "document", id });
  });
  return done("Documento excluído.");
}
