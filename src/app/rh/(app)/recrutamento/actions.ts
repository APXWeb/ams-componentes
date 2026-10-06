"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, schema } from "@/db";
import { EMPLOYMENT_TYPES, STAGES, type Stage } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { STAGE_LABEL } from "@/lib/labels";
import { fmtDateTime, slugify } from "@/lib/format";
import { STORAGE_DIR } from "@/lib/storage";

function refresh(appId?: number) {
  revalidatePath("/rh/recrutamento");
  revalidatePath("/rh");
  if (appId) revalidatePath(`/rh/candidatos/${appId}`);
}

/* ---------------------------------------------------------------- vagas */

const vacancySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  title: z.string().min(3, "Informe o cargo da vaga.").max(120),
  departmentId: z.coerce.number({ message: "Escolha o departamento." }).int().positive("Escolha o departamento."),
  positionId: z.coerce.number().int().optional().transform((v) => (v ? v : null)),
  location: z.string().min(2, "Informe a localização.").max(80),
  employmentType: z.enum(EMPLOYMENT_TYPES, { message: "Escolha o tipo de contratação." }),
  openings: z.coerce.number().int().min(1, "Mínimo de 1 vaga.").max(50),
  summary: z.string().min(10, "Escreva um resumo (mín. 10 caracteres).").max(200, "Resumo com no máximo 200 caracteres."),
  description: z.string().min(20, "Descreva as atividades.").max(4000),
  requirements: z.string().min(10, "Informe os requisitos.").max(3000),
  additionalInfo: z.string().max(2000).optional().transform((v) => v || null),
  publish: z.enum(["0", "1"]).optional(),
});

export async function saveVacancy(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("recruitment.manage");
  const parsed = vacancySchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, publish, ...v } = parsed.data;
  if (v.positionId) {
    const pos = db.select({ d: schema.positions.departmentId }).from(schema.positions).where(eq(schema.positions.id, v.positionId)).get();
    if (!pos || pos.d !== v.departmentId) return fail("O cargo escolhido não pertence ao departamento.", { positionId: "Cargo de outro departamento." });
  }
  const now = new Date().toISOString();
  let vid = id;
  if (id) {
    const cur = db.select().from(schema.vacancies).where(eq(schema.vacancies.id, id)).get();
    if (!cur) return fail("Vaga não encontrada.");
    db.update(schema.vacancies)
      .set({ ...v, updatedAt: now, ...(publish === "1" && cur.status !== "ABERTA" ? { status: "ABERTA" as const, publishedAt: now, closedAt: null } : {}) })
      .where(eq(schema.vacancies.id, id))
      .run();
    await audit(user, "EDICAO", `Vaga editada: ${v.title}`, { type: "vacancy", id });
  } else {
    let slug = slugify(v.title);
    if (db.select({ id: schema.vacancies.id }).from(schema.vacancies).where(eq(schema.vacancies.slug, slug)).get()) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    vid = db
      .insert(schema.vacancies)
      .values({ ...v, slug, status: publish === "1" ? "ABERTA" : "RASCUNHO", publishedAt: publish === "1" ? now : null, createdById: user.id })
      .returning({ id: schema.vacancies.id })
      .get().id;
    await audit(user, "CRIACAO", `Vaga criada: ${v.title}`, { type: "vacancy", id: vid });
  }
  if (publish === "1") await audit(user, "PUBLICACAO", `Vaga publicada no site: ${v.title}`, { type: "vacancy", id: vid });
  revalidatePath("/trabalhe-conosco");
  revalidatePath("/");
  refresh();
  redirect(`/rh/recrutamento/vagas?${publish === "1" ? "publicada" : "salva"}=1`);
}

export async function setVacancyStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("recruitment.manage");
  const id = Number(fd.get("id"));
  const status = String(fd.get("status"));
  if (!["ABERTA", "ENCERRADA", "RASCUNHO"].includes(status)) return fail("Situação inválida.");
  const v = db.select().from(schema.vacancies).where(eq(schema.vacancies.id, id)).get();
  if (!v) return fail("Vaga não encontrada.");
  const now = new Date().toISOString();
  db.update(schema.vacancies)
    .set({
      status: status as "ABERTA" | "ENCERRADA" | "RASCUNHO",
      publishedAt: status === "ABERTA" ? now : v.publishedAt,
      closedAt: status === "ENCERRADA" ? now : null,
      updatedAt: now,
    })
    .where(eq(schema.vacancies.id, id))
    .run();
  await audit(user, status === "ABERTA" ? "PUBLICACAO" : "EDICAO", `${status === "ABERTA" ? "Vaga publicada" : status === "ENCERRADA" ? "Vaga encerrada" : "Vaga despublicada"}: ${v.title}`, { type: "vacancy", id });
  revalidatePath("/trabalhe-conosco");
  revalidatePath("/");
  refresh();
  return done(status === "ABERTA" ? "Vaga publicada no site." : status === "ENCERRADA" ? "Vaga encerrada. Ela saiu do site." : "Vaga voltou para rascunho.");
}

/* ------------------------------------------------------------ candidaturas */

function loadApp(id: number) {
  return db
    .select({ app: schema.applications, name: schema.candidates.name, vacancy: schema.vacancies.title, vacancyStatus: schema.vacancies.status })
    .from(schema.applications)
    .innerJoin(schema.candidates, eq(schema.candidates.id, schema.applications.candidateId))
    .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
    .where(eq(schema.applications.id, id))
    .get();
}

/** Move a candidatura entre etapas (Kanban). A contratação tem fluxo próprio. */
export async function moveApplication(applicationId: number, toStage: Stage, note?: string): Promise<ActionState> {
  const user = await requireUser("recruitment.manage");
  if (!STAGES.includes(toStage)) return fail("Etapa inválida.");
  if (toStage === "CONTRATADO") return fail("Use o botão Contratar na página do candidato para concluir a contratação.");
  const a = loadApp(Number(applicationId));
  if (!a) return fail("Candidatura não encontrada.");
  if (a.app.outcome !== "EM_ANDAMENTO") return fail("Este processo já foi encerrado.");
  if (a.app.stage === toStage) return done("Sem alterações.");
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(schema.applications).set({ stage: toStage, lastActivityAt: now }).where(eq(schema.applications.id, a.app.id)).run();
    tx.insert(schema.applicationEvents)
      .values({ applicationId: a.app.id, type: "ETAPA", fromStage: a.app.stage, toStage, note: note?.slice(0, 500) || null, actorUserId: user.id })
      .run();
  });
  await audit(user, "MUDANCA_ETAPA", `${a.name}: ${STAGE_LABEL[a.app.stage]} → ${STAGE_LABEL[toStage]} (${a.vacancy})`, { type: "application", id: a.app.id });
  refresh(a.app.id);
  return done(`${a.name.split(" ")[0]} movido(a) para ${STAGE_LABEL[toStage]}.`);
}

export async function moveApplicationForm(_: ActionState, fd: FormData): Promise<ActionState> {
  return moveApplication(Number(fd.get("id")), String(fd.get("stage")) as Stage, String(fd.get("note") ?? ""));
}

const evalSchema = z.object({
  id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(0).max(5).optional(),
  notes: z.string().max(4000).optional(),
  comment: z.string().max(1000).optional(),
});

export async function evaluateApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("recruitment.manage");
  const parsed = evalSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, rating, notes, comment } = parsed.data;
  const a = loadApp(id);
  if (!a) return fail("Candidatura não encontrada.");
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(schema.applications)
      .set({ ...(rating !== undefined ? { rating: rating || null } : {}), ...(notes !== undefined ? { notes: notes || null } : {}), lastActivityAt: now })
      .where(eq(schema.applications.id, id))
      .run();
    if (rating !== undefined && rating !== (a.app.rating ?? 0)) {
      tx.insert(schema.applicationEvents).values({ applicationId: id, type: "AVALIACAO", note: `Avaliação: ${rating} de 5${comment ? `. ${comment}` : ""}`, actorUserId: user.id }).run();
    } else if (comment) {
      tx.insert(schema.applicationEvents).values({ applicationId: id, type: "NOTA", note: comment, actorUserId: user.id }).run();
    }
  });
  await audit(user, "EDICAO", `Avaliação/observações atualizadas: ${a.name}`, { type: "application", id });
  refresh(id);
  return done("Avaliação salva.");
}

export async function scheduleInterview(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("recruitment.manage");
  const id = Number(fd.get("id"));
  const when = String(fd.get("when") ?? "");
  const note = String(fd.get("note") ?? "").slice(0, 500);
  const a = loadApp(id);
  if (!a) return fail("Candidatura não encontrada.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return fail("Informe data e hora.", { when: "Informe data e hora." });
  // o campo datetime-local chega no horário de Brasília
  const iso = new Date(`${when}:00-03:00`).toISOString();
  if (iso < new Date().toISOString()) return fail("Escolha um horário futuro.", { when: "Horário no passado." });
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(schema.applications)
      .set({ interviewAt: iso, lastActivityAt: now, ...(STAGES.indexOf(a.app.stage) < 2 ? { stage: "ENTREVISTA" as const } : {}) })
      .where(eq(schema.applications.id, id))
      .run();
    tx.insert(schema.applicationEvents).values({ applicationId: id, type: "ENTREVISTA", note: `Entrevista agendada para ${fmtDateTime(iso)}${note ? `. ${note}` : ""}`, actorUserId: user.id }).run();
    if (STAGES.indexOf(a.app.stage) < 2) tx.insert(schema.applicationEvents).values({ applicationId: id, type: "ETAPA", fromStage: a.app.stage, toStage: "ENTREVISTA", actorUserId: user.id }).run();
  });
  await audit(user, "EDICAO", `Entrevista agendada: ${a.name} (${fmtDateTime(iso)})`, { type: "application", id });
  refresh(id);
  return done(`Entrevista agendada para ${fmtDateTime(iso)}.`);
}

export async function closeApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("recruitment.manage");
  const id = Number(fd.get("id"));
  const outcome = String(fd.get("outcome"));
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000);
  if (!["REPROVADO", "DESISTIU"].includes(outcome)) return fail("Escolha o motivo.");
  if (note.length < 3) return fail("Registre um motivo.", { note: "Registre um motivo." });
  const a = loadApp(id);
  if (!a || a.app.outcome !== "EM_ANDAMENTO") return fail("Processo já encerrado.");
  db.transaction((tx) => {
    tx.update(schema.applications).set({ outcome: outcome as "REPROVADO" | "DESISTIU", lastActivityAt: new Date().toISOString(), interviewAt: null }).where(eq(schema.applications.id, id)).run();
    tx.insert(schema.applicationEvents).values({ applicationId: id, type: "ENCERRAMENTO", note: `${outcome === "REPROVADO" ? "Não selecionado" : "Candidato desistiu"}: ${note}`, actorUserId: user.id }).run();
  });
  await audit(user, "EDICAO", `Processo encerrado (${outcome === "REPROVADO" ? "não selecionado" : "desistência"}): ${a.name}`, { type: "application", id });
  refresh(id);
  return done("Processo encerrado. O candidato saiu do quadro.");
}

export async function reopenApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("recruitment.manage");
  const id = Number(fd.get("id"));
  const a = loadApp(id);
  if (!a || !["REPROVADO", "DESISTIU"].includes(a.app.outcome)) return fail("Não é possível reabrir este processo.");
  db.transaction((tx) => {
    tx.update(schema.applications).set({ outcome: "EM_ANDAMENTO", lastActivityAt: new Date().toISOString() }).where(eq(schema.applications.id, id)).run();
    tx.insert(schema.applicationEvents).values({ applicationId: id, type: "NOTA", note: "Processo reaberto.", actorUserId: user.id }).run();
  });
  await audit(user, "EDICAO", `Processo reaberto: ${a.name}`, { type: "application", id });
  refresh(id);
  return done("Processo reaberto.");
}

/* -------------------------------------------------------------- contratação */

const hireSchema = z.object({
  id: z.coerce.number().int().positive(),
  positionId: z.coerce.number({ message: "Escolha o cargo." }).int().positive("Escolha o cargo."),
  managerId: z.coerce.number().int().optional().transform((v) => (v ? v : null)),
  corporateEmail: z.email("E-mail corporativo inválido.").transform((v) => v.toLowerCase()),
  hiredAt: z.iso.date("Informe a data de admissão."),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  closeVacancy: z.literal("on").optional(),
});

/**
 * Contrata o candidato aprovado: cria o funcionário com os dados já cadastrados, copia o currículo
 * para os documentos do funcionário, registra no histórico e tira a candidatura do quadro ativo.
 */
export async function hireCandidate(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("recruitment.manage", "employees.manage");
  const parsed = hireSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const row = db
    .select({ app: schema.applications, cand: schema.candidates, vacancy: schema.vacancies })
    .from(schema.applications)
    .innerJoin(schema.candidates, eq(schema.candidates.id, schema.applications.candidateId))
    .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
    .where(eq(schema.applications.id, v.id))
    .get();
  if (!row) return fail("Candidatura não encontrada.");
  if (row.app.stage !== "APROVADO" || row.app.outcome !== "EM_ANDAMENTO") return fail("Só candidatos na etapa Aprovado podem ser contratados.");
  const pos = db.select().from(schema.positions).where(eq(schema.positions.id, v.positionId)).get();
  if (!pos) return fail("Cargo inválido.", { positionId: "Cargo inválido." });
  if (db.select({ id: schema.employees.id }).from(schema.employees).where(eq(schema.employees.corporateEmail, v.corporateEmail)).get()) {
    return fail("Este e-mail corporativo já pertence a outro funcionário.", { corporateEmail: "E-mail já usado." });
  }

  const resume = db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.applicationId, row.app.id), eq(schema.documents.category, "CURRICULO")))
    .get();
  let resumeCopy: string | null = null;
  if (resume?.storageKey) {
    resumeCopy = `${randomUUID()}.${resume.storageKey.split(".").pop()}`;
    await copyFile(path.join(STORAGE_DIR, resume.storageKey), path.join(STORAGE_DIR, resumeCopy)).catch(() => (resumeCopy = null));
  }

  const now = new Date().toISOString();
  const employeeId = db.transaction((tx) => {
    const e = tx
      .insert(schema.employees)
      .values({
        name: row.cand.name,
        positionId: pos.id,
        departmentId: pos.departmentId,
        managerId: v.managerId,
        corporateEmail: v.corporateEmail,
        personalEmail: row.cand.email,
        phone: row.cand.phone,
        city: row.cand.city,
        hiredAt: v.hiredAt,
        employmentType: v.employmentType,
        sourceApplicationId: row.app.id,
      })
      .returning({ id: schema.employees.id })
      .get();
    tx.insert(schema.employeeHistory)
      .values({ employeeId: e.id, type: "ADMISSAO", description: `Admissão como ${pos.title}, pelo processo seletivo da vaga ${row.vacancy.title}.`, actorUserId: user.id, occurredAt: `${v.hiredAt}T12:00:00.000Z` })
      .run();
    if (resume && resumeCopy) {
      tx.insert(schema.documents)
        .values({ employeeId: e.id, category: "CURRICULO", title: "Currículo (processo seletivo)", storageKey: resumeCopy, originalName: resume.originalName, mimeType: resume.mimeType, sizeBytes: resume.sizeBytes, status: "VALIDADO", uploadedById: user.id, uploadedAt: now })
        .run();
    }
    // documentos admissionais ficam como pendências para o novo funcionário
    for (const [category, title] of [
      ["IDENTIFICACAO", "Documento de identificação"],
      ["COMPROVANTE", "Comprovante de residência"],
      ["CONTRATO", "Contrato de trabalho assinado"],
    ] as const) {
      tx.insert(schema.documents).values({ employeeId: e.id, category, title, status: "PENDENTE", requestedById: user.id, note: "Documento admissional." }).run();
    }
    tx.update(schema.applications)
      .set({ stage: "CONTRATADO", outcome: "CONTRATADO", hiredEmployeeId: e.id, interviewAt: null, lastActivityAt: now })
      .where(eq(schema.applications.id, row.app.id))
      .run();
    tx.insert(schema.applicationEvents)
      .values({ applicationId: row.app.id, type: "CONTRATACAO", fromStage: "APROVADO", toStage: "CONTRATADO", note: `Contratado como ${pos.title}. Admissão em ${v.hiredAt.split("-").reverse().join("/")}.`, actorUserId: user.id })
      .run();
    if (v.closeVacancy === "on") {
      tx.update(schema.vacancies).set({ status: "ENCERRADA", closedAt: now, updatedAt: now }).where(eq(schema.vacancies.id, row.vacancy.id)).run();
    }
    return e.id;
  });

  await audit(user, "CONTRATACAO", `Candidato contratado: ${row.cand.name} (${row.vacancy.title})`, { type: "employee", id: employeeId });
  if (v.closeVacancy === "on") await audit(user, "EDICAO", `Vaga encerrada após contratação: ${row.vacancy.title}`, { type: "vacancy", id: row.vacancy.id });
  revalidatePath("/trabalhe-conosco");
  refresh(row.app.id);
  revalidatePath("/rh/funcionarios");
  redirect(`/rh/funcionarios/${employeeId}?contratado=1`);
}
