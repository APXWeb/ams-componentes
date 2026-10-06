"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { PRIORITIES, REQUEST_STATUS, REQUEST_TYPES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { REQUEST_STATUS_LABEL } from "@/lib/labels";

const createSchema = z.object({
  type: z.enum(REQUEST_TYPES, { message: "Escolha o tipo." }),
  subject: z.string().min(4, "Informe o assunto.").max(120),
  message: z.string().min(10, "Descreva o pedido (mín. 10 caracteres).").max(3000),
  priority: z.enum(PRIORITIES).default("MEDIA"),
});

export async function createRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const r = db
    .insert(schema.requests)
    .values({ ...parsed.data, authorUserId: user.id, employeeId: user.employeeId })
    .returning({ id: schema.requests.id })
    .get();
  await audit(user, "CRIACAO", `Solicitação aberta: ${parsed.data.subject}`, { type: "request", id: r.id });
  revalidatePath("/rh/solicitacoes");
  revalidatePath("/rh");
  redirect(`/rh/solicitacoes/${r.id}?aberta=1`);
}

const respondSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(REQUEST_STATUS),
  response: z.string().max(3000).optional(),
});

export async function respondRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("requests.manage");
  const parsed = respondSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, status, response } = parsed.data;
  const req = db.select().from(schema.requests).where(eq(schema.requests.id, id)).get();
  if (!req) return fail("Solicitação não encontrada.");
  if ((status === "RECUSADO" || status === "CONCLUIDO" || status === "APROVADO") && !response?.trim()) {
    return fail("Escreva uma resposta para o colaborador.", { response: "A resposta é obrigatória para encerrar." });
  }
  const now = new Date().toISOString();
  db.update(schema.requests)
    .set({ status, response: response?.trim() || req.response, responderUserId: user.id, respondedAt: response?.trim() ? now : req.respondedAt, updatedAt: now })
    .where(eq(schema.requests.id, id))
    .run();
  await audit(user, status === "APROVADO" ? "APROVACAO" : status === "RECUSADO" ? "RECUSA" : "EDICAO", `Solicitação "${req.subject}" → ${REQUEST_STATUS_LABEL[status]}`, { type: "request", id });
  revalidatePath(`/rh/solicitacoes/${id}`);
  revalidatePath("/rh/solicitacoes");
  revalidatePath("/rh");
  return done(`Solicitação atualizada: ${REQUEST_STATUS_LABEL[status]}.`);
}
