import { z } from "zod";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { addDays, todayISO } from "@/lib/format";
import { getData, latency, mutate, nextId } from "../store";
import { audit } from "../audit";
import { EDUCATION_LEVELS, EXPERIENCE_LEVELS } from "../types";
import { checkFile, keepFile, nowIso } from "./util";

/*
 * Formulários públicos em modo demonstração: validam como o real, simulam o envio e não mandam
 * nada para fora do navegador. A candidatura entra no quadro do RH da própria demo, para mostrar
 * o caminho completo (site -> Kanban).
 */

const CONSENT_VERSION = "2026-10";

const phone = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length >= 10 && v.length <= 13, "Informe um telefone com DDD.");

const fmtPhone = (digits: string) => digits.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

const contactSchema = z.object({
  name: z.string().min(3, "Informe seu nome.").max(120),
  email: z.email("Informe um e-mail válido.").max(160),
  phone: z.union([z.literal(""), phone]).optional(),
  city: z.string().max(80).optional(),
  subject: z.enum(["Compras e distribuidores", "Indústria", "Exportação", "Representação comercial", "Outros assuntos"], { message: "Escolha o assunto." }),
  message: z.string().min(10, "Escreva sua mensagem (mínimo de 10 caracteres).").max(3000),
  consent: z.literal("on", { message: "É preciso concordar com o uso dos dados para responder ao contato." }),
});

export async function sendContact(_: ActionState, fd: FormData): Promise<ActionState> {
  const data = formObject(fd);
  if (data.website) return done("Mensagem enviada."); // honeypot: robôs preenchem o campo oculto
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  await latency(900, 1400);
  mutate((d) => {
    d.contactMessages.push({ id: nextId(d, "contactMessages"), name: v.name, email: v.email.toLowerCase(), phone: v.phone ? fmtPhone(v.phone) : null, city: v.city || null, subject: v.subject, message: v.message, status: "NOVA", createdAt: nowIso() });
  });
  return done("Mensagem enviada. A equipe da AMS responderá pelo e-mail informado.");
}

const applySchema = z.object({
  vacancyId: z.coerce.number({ message: "Escolha a vaga." }).int().positive("Escolha a vaga."),
  name: z.string().min(3, "Informe seu nome completo.").max(120),
  email: z.email("Informe um e-mail válido.").max(160),
  phone,
  city: z.string().min(2, "Informe sua cidade.").max(80),
  education: z.enum(EDUCATION_LEVELS, { message: "Escolha sua formação." }),
  experience: z.enum(EXPERIENCE_LEVELS, { message: "Escolha seu tempo de experiência." }),
  linkedin: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? v.replace(/^https?:\/\/(www\.)?/, "") : null))
    .refine((v) => !v || /linkedin\.com\/.+/i.test(v), "Informe o endereço do seu perfil, ex.: linkedin.com/in/seu-nome."),
  message: z.string().max(2000, "Use no máximo 2.000 caracteres.").optional(),
  consent: z.literal("on", { message: "Para se candidatar, é preciso concordar com o tratamento dos dados." }),
});

export async function applyToVacancy(_: ActionState, fd: FormData): Promise<ActionState> {
  const data = formObject(fd);
  if (data.website) return done("Candidatura enviada.");
  const parsed = applySchema.safeParse(data);
  const file = checkFile(fd.get("resume"), "resume");
  if (!parsed.success || "error" in file) {
    const base = parsed.success ? { ok: false, message: "Revise os campos destacados.", fieldErrors: {} as Record<string, string>, at: Date.now() } : zodFail(parsed.error);
    if ("error" in file) base.fieldErrors = { ...base.fieldErrors, resume: file.error };
    return base;
  }
  const v = parsed.data;
  const email = v.email.toLowerCase();
  const d0 = getData();
  const vac = d0.vacancies.find((x) => x.id === v.vacancyId && x.status === "ABERTA");
  if (!vac) return fail("Esta vaga não está mais recebendo candidaturas.", { vacancyId: "Vaga encerrada." });
  const existing = d0.candidates.find((c) => c.email === email);
  if (existing && d0.applications.some((a) => a.candidateId === existing.id && a.vacancyId === vac.id)) {
    return fail("Já recebemos uma candidatura sua para esta vaga. Nosso RH entrará em contato se o seu perfil avançar no processo.");
  }
  await latency(1400, 2000);
  const stored = keepFile(file.file);
  const now = nowIso();
  mutate((d) => {
    const retainUntil = addDays(todayISO(), 365);
    let candidateId = existing?.id;
    const fields = { name: v.name, phone: fmtPhone(v.phone), city: v.city, education: v.education, experience: v.experience, linkedin: v.linkedin, consentAt: now, consentVersion: CONSENT_VERSION, retainUntil };
    if (candidateId) Object.assign(d.candidates.find((c) => c.id === candidateId)!, fields);
    else {
      candidateId = nextId(d, "candidates");
      d.candidates.push({ id: candidateId, email, ...fields, createdAt: now });
    }
    const appId = nextId(d, "applications");
    d.applications.push({ id: appId, candidateId, vacancyId: vac.id, stage: "CANDIDATO", outcome: "EM_ANDAMENTO", message: v.message || null, notes: null, rating: null, interviewAt: null, hiredEmployeeId: null, lastActivityAt: now, createdAt: now });
    d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: appId, type: "CRIADA", fromStage: null, toStage: "CANDIDATO", note: "Candidatura recebida pelo site.", actorUserId: null, createdAt: now });
    d.documents.push({ id: nextId(d, "documents"), employeeId: null, applicationId: appId, category: "CURRICULO", title: "Currículo", ...stored, status: "ENVIADO", dueDate: null, note: null, requestedById: null, uploadedById: null, uploadedAt: now, reviewedById: null, reviewedAt: null, createdAt: now });
    audit(d, { id: null, name: "Site (candidato)" }, "CANDIDATURA", `Nova candidatura para ${vac.title}`, { type: "application", id: appId });
  });
  return done(`Currículo enviado com sucesso para a vaga ${vac.title}.`);
}
