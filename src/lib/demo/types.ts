/*
 * Modelo de dados do RH de demonstração.
 * Os nomes dos campos seguem o modelo relacional pensado para a versão real (tabelas e chaves
 * estrangeiras), para que os mocks possam ser trocados por uma API sem mudar as telas.
 * Datas: ISO 8601 (UTC) quando há hora; "YYYY-MM-DD" para datas de calendário.
 */

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

export const DOC_CATEGORIES = ["CURRICULO", "CONTRATO", "IDENTIFICACAO", "COMPROVANTE", "ATESTADO", "CERTIFICADO", "HOLERITE", "OUTROS"] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const EDUCATION_LEVELS = [
  "Ensino fundamental completo",
  "Ensino médio completo",
  "Curso técnico",
  "Superior em andamento",
  "Superior completo",
  "Pós-graduação",
] as const;

export const EXPERIENCE_LEVELS = ["Primeiro emprego", "Menos de 1 ano", "1 a 3 anos", "3 a 5 anos", "Mais de 5 anos"] as const;

export type EmployeeStatus = "ATIVO" | "AFASTADO" | "DESLIGADO";
export type DocStatus = "PENDENTE" | "ENVIADO" | "VALIDADO" | "RECUSADO";
export type VacationStatus = "PENDENTE" | "APROVADO" | "RECUSADO" | "CANCELADO";
export type VacancyStatus = "RASCUNHO" | "ABERTA" | "ENCERRADA";
export type Outcome = "EM_ANDAMENTO" | "CONTRATADO" | "REPROVADO" | "DESISTIU";
export type AppEventType = "CRIADA" | "ETAPA" | "NOTA" | "AVALIACAO" | "ENTREVISTA" | "CONTRATACAO" | "ENCERRAMENTO";
export type HistoryType = "ADMISSAO" | "CARGO" | "DEPARTAMENTO" | "GESTOR" | "STATUS" | "CADASTRO" | "DESLIGAMENTO";

export type Department = { id: number; name: string; slug: string; description: string };
export type Position = { id: number; title: string; departmentId: number };

export type Employee = {
  id: number;
  name: string;
  /** foto enviada na demonstração (data URL reduzida); sem foto, o avatar mostra as iniciais */
  photo: string | null;
  positionId: number;
  departmentId: number;
  managerId: number | null;
  corporateEmail: string;
  personalEmail: string | null;
  phone: string | null;
  city: string | null;
  hiredAt: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  terminatedAt: string | null;
  terminationReason: string | null;
  vacationBalance: number;
  sourceApplicationId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  employeeId: number | null;
  active: boolean;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
};

export type Vacancy = {
  id: number;
  slug: string;
  title: string;
  departmentId: number;
  positionId: number | null;
  location: string;
  employmentType: EmploymentType;
  summary: string;
  description: string;
  requirements: string;
  additionalInfo: string | null;
  openings: number;
  status: VacancyStatus;
  publishedAt: string | null;
  closedAt: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Candidate = {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  education: string | null;
  experience: string | null;
  linkedin: string | null;
  consentAt: string;
  consentVersion: string;
  retainUntil: string;
  createdAt: string;
};

export type Application = {
  id: number;
  candidateId: number;
  vacancyId: number;
  stage: Stage;
  outcome: Outcome;
  message: string | null;
  notes: string | null;
  rating: number | null;
  interviewAt: string | null;
  hiredEmployeeId: number | null;
  lastActivityAt: string;
  createdAt: string;
};

export type ApplicationEvent = {
  id: number;
  applicationId: number;
  type: AppEventType;
  fromStage: Stage | null;
  toStage: Stage | null;
  note: string | null;
  actorUserId: number | null;
  createdAt: string;
};

export type DocumentRow = {
  id: number;
  employeeId: number | null;
  applicationId: number | null;
  category: DocCategory;
  title: string;
  /** identificador do arquivo de demonstração; nulo enquanto o documento está pendente */
  storageKey: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocStatus;
  dueDate: string | null;
  note: string | null;
  requestedById: number | null;
  uploadedById: number | null;
  uploadedAt: string | null;
  reviewedById: number | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type Vacation = {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  days: number;
  status: VacationStatus;
  note: string | null;
  reviewNote: string | null;
  reviewedById: number | null;
  reviewedAt: string | null;
  requestedById: number | null;
  createdAt: string;
};

export type RequestRow = {
  id: number;
  authorUserId: number;
  employeeId: number | null;
  type: RequestType;
  subject: string;
  message: string;
  priority: Priority;
  status: RequestStatus;
  response: string | null;
  responderUserId: number | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Announcement = {
  id: number;
  title: string;
  body: string;
  priority: "NORMAL" | "IMPORTANTE" | "URGENTE";
  audience: "TODOS" | "DEPARTAMENTO" | "GESTORES";
  audienceDepartmentId: number | null;
  publishedAt: string;
  expiresAt: string | null;
  authorUserId: number | null;
  /** leituras de colaboradores fora dos perfis de demonstração */
  baseReads: number;
  createdAt: string;
};

export type AnnouncementRead = { announcementId: number; userId: number; readAt: string };

export type EmployeeHistory = {
  id: number;
  employeeId: number;
  type: HistoryType;
  description: string;
  actorUserId: number | null;
  occurredAt: string;
};

export type AuditLog = {
  id: number;
  userId: number | null;
  actorLabel: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  summary: string;
  ip: string;
  createdAt: string;
};

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  subject: string;
  message: string;
  status: "NOVA" | "RESPONDIDA" | "ARQUIVADA";
  createdAt: string;
};

export type DemoData = {
  version: number;
  /** dia em que os dados foram gerados: as datas são relativas a ele */
  seededOn: string;
  departments: Department[];
  positions: Position[];
  employees: Employee[];
  users: User[];
  vacancies: Vacancy[];
  candidates: Candidate[];
  applications: Application[];
  applicationEvents: ApplicationEvent[];
  documents: DocumentRow[];
  vacations: Vacation[];
  requests: RequestRow[];
  announcements: Announcement[];
  announcementReads: AnnouncementRead[];
  employeeHistory: EmployeeHistory[];
  auditLogs: AuditLog[];
  contactMessages: ContactMessage[];
  /** notificações já vistas por usuário (ids de notificação) */
  seenNotifications: Record<number, string[]>;
  seq: Record<string, number>;
};

/** Usuário da sessão de demonstração, no formato que as telas consomem. */
export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  employeeId: number | null;
  departmentId: number | null;
};
