import { z } from "zod";
import { done, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { STAGE_LABEL } from "@/lib/labels";
import { fmtDateTime, slugify } from "@/lib/format";
import { latency, mutate, getData, nextId } from "../store";
import { audit } from "../audit";
import { EMPLOYMENT_TYPES, STAGES, type DemoData, type Stage } from "../types";
import { authorize, nowIso } from "./util";

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
  const { user, denied } = authorize("recruitment.manage");
  if (denied) return denied;
  const parsed = vacancySchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  await latency();
  const { id, publish, ...v } = parsed.data;
  const d0 = getData();
  if (v.positionId && d0.positions.find((p) => p.id === v.positionId)?.departmentId !== v.departmentId) {
    return fail("O cargo escolhido não pertence ao departamento.", { positionId: "Cargo de outro departamento." });
  }
  if (id && !d0.vacancies.some((x) => x.id === id)) return fail("Vaga não encontrada.");
  const now = nowIso();
  mutate((d) => {
    let vid = id;
    if (id) {
      const cur = d.vacancies.find((x) => x.id === id)!;
      Object.assign(cur, v, { updatedAt: now }, publish === "1" && cur.status !== "ABERTA" ? { status: "ABERTA", publishedAt: now, closedAt: null } : {});
      audit(d, user, "EDICAO", `Vaga editada: ${v.title}`, { type: "vacancy", id });
    } else {
      let slug = slugify(v.title);
      if (d.vacancies.some((x) => x.slug === slug)) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      vid = nextId(d, "vacancies");
      d.vacancies.push({ id: vid, slug, ...v, status: publish === "1" ? "ABERTA" : "RASCUNHO", publishedAt: publish === "1" ? now : null, closedAt: null, createdById: user.id, createdAt: now, updatedAt: now });
      audit(d, user, "CRIACAO", `Vaga criada: ${v.title}`, { type: "vacancy", id: vid });
    }
    if (publish === "1") audit(d, user, "PUBLICACAO", `Vaga publicada no site: ${v.title}`, { type: "vacancy", id: vid });
  });
  return done(publish === "1" ? "Vaga publicada no site." : "Vaga salva como rascunho.", { redirect: "/rh/recrutamento/vagas" });
}

export async function setVacancyStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("recruitment.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const status = String(fd.get("status"));
  if (!["ABERTA", "ENCERRADA", "RASCUNHO"].includes(status)) return fail("Situação inválida.");
  if (!getData().vacancies.some((v) => v.id === id)) return fail("Vaga não encontrada.");
  await latency();
  mutate((d) => {
    const v = d.vacancies.find((x) => x.id === id)!;
    const now = nowIso();
    Object.assign(v, { status, publishedAt: status === "ABERTA" ? now : v.publishedAt, closedAt: status === "ENCERRADA" ? now : null, updatedAt: now });
    audit(d, user, status === "ABERTA" ? "PUBLICACAO" : "EDICAO", `${status === "ABERTA" ? "Vaga publicada" : status === "ENCERRADA" ? "Vaga encerrada" : "Vaga despublicada"}: ${v.title}`, { type: "vacancy", id });
  });
  return done(status === "ABERTA" ? "Vaga publicada no site." : status === "ENCERRADA" ? "Vaga encerrada. Ela saiu do site." : "Vaga voltou para rascunho.");
}

/* ------------------------------------------------------------ candidaturas */

function loadApp(d: DemoData, id: number) {
  const app = d.applications.find((a) => a.id === id);
  if (!app) return undefined;
  return { app, name: d.candidates.find((c) => c.id === app.candidateId)!.name, vacancy: d.vacancies.find((v) => v.id === app.vacancyId)!.title };
}

/** Move a candidatura entre etapas (Kanban). A contratação tem fluxo próprio. */
export async function moveApplication(applicationId: number, toStage: Stage, note?: string, wait = true): Promise<ActionState> {
  const { user, denied } = authorize("recruitment.manage");
  if (denied) return denied;
  if (!STAGES.includes(toStage)) return fail("Etapa inválida.");
  if (toStage === "CONTRATADO") return fail("Use o botão Contratar na página do candidato para concluir a contratação.");
  const a = loadApp(getData(), Number(applicationId));
  if (!a) return fail("Candidatura não encontrada.");
  if (a.app.outcome !== "EM_ANDAMENTO") return fail("Este processo já foi encerrado.");
  if (a.app.stage === toStage) return done("Sem alterações.");
  if (wait) await latency(220, 420);
  const from = a.app.stage;
  mutate((d) => {
    const app = d.applications.find((x) => x.id === a.app.id)!;
    app.stage = toStage;
    app.lastActivityAt = nowIso();
    d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: app.id, type: "ETAPA", fromStage: from, toStage, note: note?.slice(0, 500) || null, actorUserId: user.id, createdAt: nowIso() });
    audit(d, user, "MUDANCA_ETAPA", `${a.name}: ${STAGE_LABEL[from]} → ${STAGE_LABEL[toStage]} (${a.vacancy})`, { type: "application", id: app.id });
  });
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
  const { user, denied } = authorize("recruitment.manage");
  if (denied) return denied;
  const parsed = evalSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const { id, rating, notes, comment } = parsed.data;
  const a = loadApp(getData(), id);
  if (!a) return fail("Candidatura não encontrada.");
  await latency();
  mutate((d) => {
    const app = d.applications.find((x) => x.id === id)!;
    const before = app.rating ?? 0;
    if (rating !== undefined) app.rating = rating || null;
    if (notes !== undefined) app.notes = notes || null;
    app.lastActivityAt = nowIso();
    if (rating !== undefined && rating !== before) {
      d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: id, type: "AVALIACAO", fromStage: null, toStage: null, note: `Avaliação: ${rating} de 5${comment ? `. ${comment}` : ""}`, actorUserId: user.id, createdAt: nowIso() });
    } else if (comment) {
      d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: id, type: "NOTA", fromStage: null, toStage: null, note: comment, actorUserId: user.id, createdAt: nowIso() });
    }
    audit(d, user, "EDICAO", `Avaliação/observações atualizadas: ${a.name}`, { type: "application", id });
  });
  return done("Avaliação salva.");
}

export async function scheduleInterview(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("recruitment.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const when = String(fd.get("when") ?? "");
  const note = String(fd.get("note") ?? "").slice(0, 500);
  const a = loadApp(getData(), id);
  if (!a) return fail("Candidatura não encontrada.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return fail("Informe data e hora.", { when: "Informe data e hora." });
  // o campo datetime-local chega no horário de Brasília
  const iso = new Date(`${when}:00-03:00`).toISOString();
  if (iso < nowIso()) return fail("Escolha um horário futuro.", { when: "Horário no passado." });
  await latency();
  mutate((d) => {
    const app = d.applications.find((x) => x.id === id)!;
    const advance = STAGES.indexOf(app.stage) < 2;
    const from = app.stage;
    app.interviewAt = iso;
    app.lastActivityAt = nowIso();
    if (advance) app.stage = "ENTREVISTA";
    d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: id, type: "ENTREVISTA", fromStage: null, toStage: null, note: `Entrevista agendada para ${fmtDateTime(iso)}${note ? `. ${note}` : ""}`, actorUserId: user.id, createdAt: nowIso() });
    if (advance) d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: id, type: "ETAPA", fromStage: from, toStage: "ENTREVISTA", note: null, actorUserId: user.id, createdAt: nowIso() });
    audit(d, user, "EDICAO", `Entrevista agendada: ${a.name} (${fmtDateTime(iso)})`, { type: "application", id });
  });
  return done(`Entrevista agendada para ${fmtDateTime(iso)}. O convite foi registrado no histórico.`);
}

export async function closeApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("recruitment.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const outcome = String(fd.get("outcome"));
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000);
  if (!["REPROVADO", "DESISTIU"].includes(outcome)) return fail("Escolha o motivo.");
  if (note.length < 3) return fail("Registre um motivo.", { note: "Registre um motivo." });
  const a = loadApp(getData(), id);
  if (!a || a.app.outcome !== "EM_ANDAMENTO") return fail("Processo já encerrado.");
  await latency();
  mutate((d) => {
    const app = d.applications.find((x) => x.id === id)!;
    Object.assign(app, { outcome, lastActivityAt: nowIso(), interviewAt: null });
    d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: id, type: "ENCERRAMENTO", fromStage: null, toStage: null, note: `${outcome === "REPROVADO" ? "Não selecionado" : "Candidato desistiu"}: ${note}`, actorUserId: user.id, createdAt: nowIso() });
    audit(d, user, "EDICAO", `Processo encerrado (${outcome === "REPROVADO" ? "não selecionado" : "desistência"}): ${a.name}`, { type: "application", id });
  });
  return done("Processo encerrado. O candidato saiu do quadro.");
}

export async function reopenApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("recruitment.manage");
  if (denied) return denied;
  const id = Number(fd.get("id"));
  const a = loadApp(getData(), id);
  if (!a || !["REPROVADO", "DESISTIU"].includes(a.app.outcome)) return fail("Não é possível reabrir este processo.");
  await latency();
  mutate((d) => {
    const app = d.applications.find((x) => x.id === id)!;
    app.outcome = "EM_ANDAMENTO";
    app.lastActivityAt = nowIso();
    d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: id, type: "NOTA", fromStage: null, toStage: null, note: "Processo reaberto.", actorUserId: user.id, createdAt: nowIso() });
    audit(d, user, "EDICAO", `Processo reaberto: ${a.name}`, { type: "application", id });
  });
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
 * Contrata o candidato aprovado: cria o funcionário com os dados já cadastrados, leva o currículo
 * para os documentos dele, pede os documentos admissionais e tira a candidatura do quadro ativo.
 */
export async function hireCandidate(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = authorize("recruitment.manage");
  if (denied) return denied;
  const parsed = hireSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const d0 = getData();
  const app0 = d0.applications.find((a) => a.id === v.id);
  if (!app0) return fail("Candidatura não encontrada.");
  if (app0.stage !== "APROVADO" || app0.outcome !== "EM_ANDAMENTO") return fail("Só candidatos na etapa Aprovado podem ser contratados.");
  const pos = d0.positions.find((p) => p.id === v.positionId);
  if (!pos) return fail("Cargo inválido.", { positionId: "Cargo inválido." });
  if (d0.employees.some((e) => e.corporateEmail === v.corporateEmail)) return fail("Este e-mail corporativo já pertence a outro funcionário.", { corporateEmail: "E-mail já usado." });
  await latency(700, 1100);

  const employeeId = mutate((d) => {
    const app = d.applications.find((a) => a.id === v.id)!;
    const cand = d.candidates.find((c) => c.id === app.candidateId)!;
    const vac = d.vacancies.find((x) => x.id === app.vacancyId)!;
    const now = nowIso();
    const id = nextId(d, "employees");
    d.employees.push({
      id,
      name: cand.name,
      photo: null,
      positionId: pos.id,
      departmentId: pos.departmentId,
      managerId: v.managerId,
      corporateEmail: v.corporateEmail,
      personalEmail: cand.email,
      phone: cand.phone,
      city: cand.city,
      hiredAt: v.hiredAt,
      employmentType: v.employmentType,
      status: "ATIVO",
      terminatedAt: null,
      terminationReason: null,
      vacationBalance: 0,
      sourceApplicationId: app.id,
      createdAt: now,
      updatedAt: now,
    });
    d.employeeHistory.push({ id: nextId(d, "employeeHistory"), employeeId: id, type: "ADMISSAO", description: `Admissão como ${pos.title}, pelo processo seletivo da vaga ${vac.title}.`, actorUserId: user.id, occurredAt: `${v.hiredAt}T12:00:00.000Z` });
    const resume = d.documents.find((x) => x.applicationId === app.id && x.category === "CURRICULO");
    const base = { applicationId: null, dueDate: null, requestedById: null, reviewedById: null, reviewedAt: null, createdAt: now };
    if (resume) {
      d.documents.push({ ...base, id: nextId(d, "documents"), employeeId: id, category: "CURRICULO", title: "Currículo (processo seletivo)", storageKey: resume.storageKey, originalName: resume.originalName, mimeType: resume.mimeType, sizeBytes: resume.sizeBytes, status: "VALIDADO", note: null, uploadedById: user.id, uploadedAt: now });
    }
    // documentos admissionais ficam como pendências para o novo funcionário
    for (const [category, title] of [
      ["IDENTIFICACAO", "Documento de identificação"],
      ["COMPROVANTE", "Comprovante de residência"],
      ["CONTRATO", "Contrato de trabalho assinado"],
    ] as const) {
      d.documents.push({ ...base, id: nextId(d, "documents"), employeeId: id, category, title, storageKey: null, originalName: null, mimeType: null, sizeBytes: null, status: "PENDENTE", note: "Documento admissional.", requestedById: user.id, uploadedById: null, uploadedAt: null });
    }
    Object.assign(app, { stage: "CONTRATADO", outcome: "CONTRATADO", hiredEmployeeId: id, interviewAt: null, lastActivityAt: now });
    d.applicationEvents.push({ id: nextId(d, "applicationEvents"), applicationId: app.id, type: "CONTRATACAO", fromStage: "APROVADO", toStage: "CONTRATADO", note: `Contratado como ${pos.title}. Admissão em ${v.hiredAt.split("-").reverse().join("/")}.`, actorUserId: user.id, createdAt: now });
    if (v.closeVacancy === "on") Object.assign(vac, { status: "ENCERRADA", closedAt: now, updatedAt: now });
    audit(d, user, "CONTRATACAO", `Candidato contratado: ${cand.name} (${vac.title})`, { type: "employee", id });
    if (v.closeVacancy === "on") audit(d, user, "EDICAO", `Vaga encerrada após contratação: ${vac.title}`, { type: "vacancy", id: vac.id });
    return id;
  });
  return done("Contratação concluída: cadastro criado e documentos admissionais pedidos.", { redirect: `/rh/funcionarios/${employeeId}` });
}
