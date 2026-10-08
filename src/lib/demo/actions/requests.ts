import { z } from "zod";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { REQUEST_STATUS_LABEL } from "@/lib/labels";
import { getData, latency, mutate, nextId } from "../store";
import { audit } from "../audit";
import { PRIORITIES, REQUEST_STATUS, REQUEST_TYPES } from "../types";
import { authorize, nowIso } from "./util";

const createSchema = z.object({
  type: z.enum(REQUEST_TYPES, { message: "Escolha o tipo." }),
  subject: z.string().min(4, "Informe o assunto.").max(120),
  message: z.string().min(10, "Descreva o pedido (mín. 10 caracteres).").max(3000),
  priority: z.enum(PRIORITIES).default("MEDIA"),
});

export async function createRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = authorize();
  const parsed = createSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  await latency();
  const id = mutate((d) => {
    const id = nextId(d, "requests");
    const now = nowIso();
    d.requests.push({ id, ...parsed.data, authorUserId: user.id, employeeId: user.employeeId, status: "PENDENTE", response: null, responderUserId: null, respondedAt: null, createdAt: now, updatedAt: now });
    audit(d, user, "CRIACAO", `Solicitação aberta: ${parsed.data.subject}`, { type: "request", id });
    return id;
  });
  return done("Solicitação enviada ao RH.", { redirect: `/rh/solicitacoes/${id}` });
}

const respondSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(REQUEST_STATUS),
  response: z.string().max(3000).optional(),
});

export async function respondRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("requests.manage");
  if (denied) return denied;
  const parsed = respondSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, status, response } = parsed.data;
  const req = getData().requests.find((r) => r.id === id);
  if (!req) return fail("Solicitação não encontrada.");
  if ((status === "RECUSADO" || status === "CONCLUIDO" || status === "APROVADO") && !response?.trim()) {
    return fail("Escreva uma resposta para o colaborador.", { response: "A resposta é obrigatória para encerrar." });
  }
  await latency();
  mutate((d) => {
    const r = d.requests.find((x) => x.id === id)!;
    const now = nowIso();
    Object.assign(r, { status, response: response?.trim() || r.response, responderUserId: user.id, respondedAt: response?.trim() ? now : r.respondedAt, updatedAt: now });
    audit(d, user, status === "APROVADO" ? "APROVACAO" : status === "RECUSADO" ? "RECUSA" : "EDICAO", `Solicitação "${req.subject}" → ${REQUEST_STATUS_LABEL[status]}`, { type: "request", id });
  });
  return done(`Solicitação atualizada: ${REQUEST_STATUS_LABEL[status]}.`);
}
