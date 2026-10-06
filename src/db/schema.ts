import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
  primaryKey,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

/*
 * Modelo de dados do ecossistema AMS (site público + RH privado).
 * Datas: ISO 8601 em texto (UTC). Datas sem hora (admissão, férias): "YYYY-MM-DD".
 * Dados pessoais ficam apenas aqui e em storage/ (fora de public/); ver docs/LGPD.md.
 */

const id = () => integer("id").primaryKey({ autoIncrement: true });
const createdAt = () => text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
const updatedAt = () => text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

export const ROLES = ["ADMIN", "RH", "GESTOR", "FUNCIONARIO"] as const;
export type Role = (typeof ROLES)[number];

export const STAGES = ["CANDIDATO", "TRIAGEM", "ENTREVISTA", "AVALIACAO", "APROVADO", "CONTRATADO"] as const;
export type Stage = (typeof STAGES)[number];

export const REQUEST_STATUS = ["PENDENTE", "EM_ANALISE", "APROVADO", "RECUSADO", "CONCLUIDO"] as const;
export type RequestStatus = (typeof REQUEST_STATUS)[number];

export const REQUEST_TYPES = ["FERIAS", "DOCUMENTO", "ATUALIZACAO_CADASTRAL", "JUSTIFICATIVA", "OUTROS"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const PRIORITIES = ["BAIXA", "MEDIA", "ALTA"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const EMPLOYMENT_TYPES = ["CLT", "ESTAGIO", "TEMPORARIO", "APRENDIZ", "PJ"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const DOC_CATEGORIES = [
  "CURRICULO",
  "CONTRATO",
  "IDENTIFICACAO",
  "COMPROVANTE",
  "ATESTADO",
  "CERTIFICADO",
  "HOLERITE",
  "OUTROS",
] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

/* ---------------------------------------------------------------- estrutura */

export const departments = sqliteTable("departments", {
  id: id(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: createdAt(),
});

export const positions = sqliteTable(
  "positions",
  {
    id: id(),
    title: text("title").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("positions_title_dept").on(t.title, t.departmentId)],
);

export const employees = sqliteTable(
  "employees",
  {
    id: id(),
    name: text("name").notNull(),
    photoDocumentId: integer("photo_document_id"),
    positionId: integer("position_id")
      .notNull()
      .references(() => positions.id),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    managerId: integer("manager_id").references((): AnySQLiteColumn => employees.id),
    corporateEmail: text("corporate_email").notNull().unique(),
    personalEmail: text("personal_email"),
    phone: text("phone"),
    city: text("city"),
    hiredAt: text("hired_at").notNull(),
    employmentType: text("employment_type", { enum: EMPLOYMENT_TYPES }).notNull().default("CLT"),
    status: text("status", { enum: ["ATIVO", "AFASTADO", "DESLIGADO"] }).notNull().default("ATIVO"),
    terminatedAt: text("terminated_at"),
    terminationReason: text("termination_reason"),
    vacationBalance: integer("vacation_balance").notNull().default(30),
    sourceApplicationId: integer("source_application_id"),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("employees_dept").on(t.departmentId), index("employees_manager").on(t.managerId)],
);

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("FUNCIONARIO"),
  employeeId: integer("employee_id")
    .unique()
    .references(() => employees.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  lastLoginAt: text("last_login_at"),
  passwordChangedAt: text("password_changed_at"),
  createdAt: createdAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    // sha-256 do token; o token em claro existe apenas no cookie do navegador
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);

/* ------------------------------------------------------------ recrutamento */

export const vacancies = sqliteTable(
  "vacancies",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    positionId: integer("position_id").references(() => positions.id),
    location: text("location").notNull(),
    employmentType: text("employment_type", { enum: EMPLOYMENT_TYPES }).notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    requirements: text("requirements").notNull(),
    additionalInfo: text("additional_info"),
    openings: integer("openings").notNull().default(1),
    status: text("status", { enum: ["RASCUNHO", "ABERTA", "ENCERRADA"] }).notNull().default("RASCUNHO"),
    publishedAt: text("published_at"),
    closedAt: text("closed_at"),
    createdById: integer("created_by_id").references(() => users.id),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("vacancies_status").on(t.status)],
);

export const candidates = sqliteTable("candidates", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  consentAt: text("consent_at").notNull(),
  consentVersion: text("consent_version").notNull(),
  // data limite de retenção (LGPD): após isso o cadastro é anonimizado
  retainUntil: text("retain_until").notNull(),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const applications = sqliteTable(
  "applications",
  {
    id: id(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    vacancyId: integer("vacancy_id")
      .notNull()
      .references(() => vacancies.id),
    stage: text("stage", { enum: STAGES }).notNull().default("CANDIDATO"),
    // ativo enquanto o processo segue; encerrado quando contratado, reprovado ou desistente
    outcome: text("outcome", { enum: ["EM_ANDAMENTO", "CONTRATADO", "REPROVADO", "DESISTIU"] })
      .notNull()
      .default("EM_ANDAMENTO"),
    message: text("message"),
    notes: text("notes"),
    rating: integer("rating"),
    interviewAt: text("interview_at"),
    hiredEmployeeId: integer("hired_employee_id").references(() => employees.id),
    lastActivityAt: text("last_activity_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("applications_candidate_vacancy").on(t.candidateId, t.vacancyId),
    index("applications_vacancy_stage").on(t.vacancyId, t.stage),
  ],
);

export const applicationEvents = sqliteTable(
  "application_events",
  {
    id: id(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["CRIADA", "ETAPA", "NOTA", "AVALIACAO", "ENTREVISTA", "CONTRATACAO", "ENCERRAMENTO"],
    }).notNull(),
    fromStage: text("from_stage", { enum: STAGES }),
    toStage: text("to_stage", { enum: STAGES }),
    note: text("note"),
    actorUserId: integer("actor_user_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("application_events_app").on(t.applicationId)],
);

/* -------------------------------------------------------------- documentos */

export const documents = sqliteTable(
  "documents",
  {
    id: id(),
    employeeId: integer("employee_id").references(() => employees.id),
    applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }),
    category: text("category", { enum: DOC_CATEGORIES }).notNull(),
    title: text("title").notNull(),
    // chave do arquivo em storage/ (nunca exposto); nulo enquanto o documento está pendente
    storageKey: text("storage_key"),
    originalName: text("original_name"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    status: text("status", { enum: ["PENDENTE", "ENVIADO", "VALIDADO", "RECUSADO"] }).notNull(),
    dueDate: text("due_date"),
    note: text("note"),
    requestedById: integer("requested_by_id").references(() => users.id),
    uploadedById: integer("uploaded_by_id").references(() => users.id),
    uploadedAt: text("uploaded_at"),
    reviewedById: integer("reviewed_by_id").references(() => users.id),
    reviewedAt: text("reviewed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("documents_employee").on(t.employeeId), index("documents_status").on(t.status)],
);

/* ------------------------------------------------- férias e solicitações */

export const vacations = sqliteTable(
  "vacations",
  {
    id: id(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    days: integer("days").notNull(),
    status: text("status", { enum: ["PENDENTE", "APROVADO", "RECUSADO", "CANCELADO"] })
      .notNull()
      .default("PENDENTE"),
    note: text("note"),
    reviewNote: text("review_note"),
    reviewedById: integer("reviewed_by_id").references(() => users.id),
    reviewedAt: text("reviewed_at"),
    requestedById: integer("requested_by_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("vacations_employee").on(t.employeeId), index("vacations_dates").on(t.startDate)],
);

export const requests = sqliteTable(
  "requests",
  {
    id: id(),
    authorUserId: integer("author_user_id")
      .notNull()
      .references(() => users.id),
    employeeId: integer("employee_id").references(() => employees.id),
    type: text("type", { enum: REQUEST_TYPES }).notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("MEDIA"),
    status: text("status", { enum: REQUEST_STATUS }).notNull().default("PENDENTE"),
    response: text("response"),
    responderUserId: integer("responder_user_id").references(() => users.id),
    respondedAt: text("responded_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("requests_status").on(t.status), index("requests_employee").on(t.employeeId)],
);

/* ------------------------------------------------------------- comunicados */

export const announcements = sqliteTable("announcements", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: text("priority", { enum: ["NORMAL", "IMPORTANTE", "URGENTE"] }).notNull().default("NORMAL"),
  audience: text("audience", { enum: ["TODOS", "DEPARTAMENTO", "GESTORES"] }).notNull().default("TODOS"),
  audienceDepartmentId: integer("audience_department_id").references(() => departments.id),
  publishedAt: text("published_at").notNull(),
  expiresAt: text("expires_at"),
  authorUserId: integer("author_user_id").references(() => users.id),
  createdAt: createdAt(),
});

export const announcementReads = sqliteTable(
  "announcement_reads",
  {
    announcementId: integer("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: text("read_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.userId] })],
);

/* ------------------------------------------------- histórico e auditoria */

export const employeeHistory = sqliteTable(
  "employee_history",
  {
    id: id(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    type: text("type", {
      enum: ["ADMISSAO", "CARGO", "DEPARTAMENTO", "GESTOR", "STATUS", "CADASTRO", "DESLIGAMENTO"],
    }).notNull(),
    description: text("description").notNull(),
    actorUserId: integer("actor_user_id").references(() => users.id),
    occurredAt: text("occurred_at").notNull(),
  },
  (t) => [index("employee_history_emp").on(t.employeeId)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    userId: integer("user_id").references(() => users.id),
    actorLabel: text("actor_label").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    summary: text("summary").notNull(),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created").on(t.createdAt), index("audit_entity").on(t.entityType, t.entityId)],
);

/* ------------------------------------------------------------ site público */

export const contactMessages = sqliteTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  city: text("city"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["NOVA", "RESPONDIDA", "ARQUIVADA"] }).notNull().default("NOVA"),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------- relações */

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
  positions: many(positions),
  vacancies: many(vacancies),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  department: one(departments, { fields: [positions.departmentId], references: [departments.id] }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, { fields: [employees.departmentId], references: [departments.id] }),
  position: one(positions, { fields: [employees.positionId], references: [positions.id] }),
  manager: one(employees, { fields: [employees.managerId], references: [employees.id], relationName: "manager" }),
  reports: many(employees, { relationName: "manager" }),
  documents: many(documents),
  vacations: many(vacations),
  history: many(employeeHistory),
  requests: many(requests),
}));

export const usersRelations = relations(users, ({ one }) => ({
  employee: one(employees, { fields: [users.employeeId], references: [employees.id] }),
}));

export const vacanciesRelations = relations(vacancies, ({ one, many }) => ({
  department: one(departments, { fields: [vacancies.departmentId], references: [departments.id] }),
  position: one(positions, { fields: [vacancies.positionId], references: [positions.id] }),
  applications: many(applications),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  candidate: one(candidates, { fields: [applications.candidateId], references: [candidates.id] }),
  vacancy: one(vacancies, { fields: [applications.vacancyId], references: [vacancies.id] }),
  events: many(applicationEvents),
  documents: many(documents),
  hiredEmployee: one(employees, { fields: [applications.hiredEmployeeId], references: [employees.id] }),
}));

export const applicationEventsRelations = relations(applicationEvents, ({ one }) => ({
  application: one(applications, { fields: [applicationEvents.applicationId], references: [applications.id] }),
  actor: one(users, { fields: [applicationEvents.actorUserId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  employee: one(employees, { fields: [documents.employeeId], references: [employees.id] }),
  application: one(applications, { fields: [documents.applicationId], references: [applications.id] }),
}));

export const vacationsRelations = relations(vacations, ({ one }) => ({
  employee: one(employees, { fields: [vacations.employeeId], references: [employees.id] }),
  reviewer: one(users, { fields: [vacations.reviewedById], references: [users.id] }),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  author: one(users, { fields: [requests.authorUserId], references: [users.id], relationName: "author" }),
  responder: one(users, { fields: [requests.responderUserId], references: [users.id], relationName: "responder" }),
  employee: one(employees, { fields: [requests.employeeId], references: [employees.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, { fields: [announcements.authorUserId], references: [users.id] }),
  department: one(departments, { fields: [announcements.audienceDepartmentId], references: [departments.id] }),
}));

export const employeeHistoryRelations = relations(employeeHistory, ({ one }) => ({
  employee: one(employees, { fields: [employeeHistory.employeeId], references: [employees.id] }),
  actor: one(users, { fields: [employeeHistory.actorUserId], references: [users.id] }),
}));
