"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { rateLimit } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/auth";
import { saveUpload, removeStored, UploadError } from "@/lib/storage";
import { audit } from "@/lib/audit";
import { addDays, todayISO } from "@/lib/format";

const CONSENT_VERSION = "2026-10";
const RETENTION_DAYS = 365;

const phone = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length >= 10 && v.length <= 13, "Informe um telefone com DDD.");

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
  const { ip } = await requestMeta();
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60_000)) return fail("Muitas mensagens em pouco tempo. Tente novamente em alguns minutos.");
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  db.insert(schema.contactMessages)
    .values({ name: v.name, email: v.email.toLowerCase(), phone: v.phone || null, city: v.city || null, subject: v.subject, message: v.message })
    .run();
  return done("Mensagem enviada. A equipe da AMS responderá pelo e-mail informado.");
}

const applySchema = z.object({
  vacancyId: z.coerce.number().int().positive(),
  name: z.string().min(3, "Informe seu nome completo.").max(120),
  email: z.email("Informe um e-mail válido.").max(160),
  phone,
  city: z.string().min(2, "Informe sua cidade.").max(80),
  message: z.string().max(2000, "Use no máximo 2.000 caracteres.").optional(),
  consent: z.literal("on", { message: "Para se candidatar, é preciso concordar com o tratamento dos dados." }),
});

export async function applyToVacancy(_: ActionState, fd: FormData): Promise<ActionState> {
  const data = formObject(fd);
  if (data.website) return done("Candidatura enviada.");
  const { ip } = await requestMeta();
  if (!rateLimit(`apply:${ip}`, 6, 15 * 60_000)) return fail("Muitas tentativas em pouco tempo. Tente novamente em alguns minutos.");

  const parsed = applySchema.safeParse(data);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const email = v.email.toLowerCase();

  const vacancy = db
    .select({ id: schema.vacancies.id, title: schema.vacancies.title })
    .from(schema.vacancies)
    .where(and(eq(schema.vacancies.id, v.vacancyId), eq(schema.vacancies.status, "ABERTA")))
    .get();
  if (!vacancy) return fail("Esta vaga não está mais recebendo candidaturas.");

  const existing = db.select().from(schema.candidates).where(eq(schema.candidates.email, email)).get();
  if (existing && db.select({ id: schema.applications.id }).from(schema.applications).where(and(eq(schema.applications.candidateId, existing.id), eq(schema.applications.vacancyId, vacancy.id))).get()) {
    return fail("Já recebemos uma candidatura sua para esta vaga. Nosso RH entrará em contato se o seu perfil avançar no processo.");
  }

  const file = fd.get("resume");
  if (!(file instanceof File) || file.size === 0) return fail("Anexe seu currículo.", { resume: "Anexe seu currículo em PDF ou DOCX." });
  let stored;
  try {
    stored = await saveUpload(file, "resume");
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message, { resume: e.message });
    throw e;
  }

  const now = new Date().toISOString();
  const retainUntil = addDays(todayISO(), RETENTION_DAYS);
  try {
    const appId = db.transaction((tx) => {
      const candidateId = existing
        ? (tx
            .update(schema.candidates)
            .set({ name: v.name, phone: v.phone, city: v.city, consentAt: now, consentVersion: CONSENT_VERSION, retainUntil })
            .where(eq(schema.candidates.id, existing.id))
            .run(),
          existing.id)
        : tx
            .insert(schema.candidates)
            .values({ name: v.name, email, phone: v.phone, city: v.city, consentAt: now, consentVersion: CONSENT_VERSION, retainUntil })
            .returning({ id: schema.candidates.id })
            .get().id;
      const app = tx
        .insert(schema.applications)
        .values({ candidateId, vacancyId: vacancy.id, message: v.message || null, lastActivityAt: now })
        .returning({ id: schema.applications.id })
        .get();
      tx.insert(schema.applicationEvents).values({ applicationId: app.id, type: "CRIADA", toStage: "CANDIDATO", note: "Candidatura recebida pelo site." }).run();
      tx.insert(schema.documents)
        .values({ applicationId: app.id, category: "CURRICULO", title: "Currículo", status: "ENVIADO", uploadedAt: now, ...stored })
        .run();
      return app.id;
    });
    await audit({ id: null, name: "Site (candidato)" }, "CANDIDATURA", `Nova candidatura para ${vacancy.title}`, { type: "application", id: appId });
  } catch (e) {
    await removeStored(stored.storageKey);
    throw e;
  }
  return done(`Candidatura enviada para a vaga ${vacancy.title}.`);
}
