import type { DocCategory, EmploymentType, Priority, RequestStatus, RequestType, Stage } from "@/lib/demo/types";

export const STAGE_LABEL: Record<Stage, string> = {
  CANDIDATO: "Candidato",
  TRIAGEM: "Triagem",
  ENTREVISTA: "Entrevista",
  AVALIACAO: "Avaliação",
  APROVADO: "Aprovado",
  CONTRATADO: "Contratado",
};

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  CLT: "CLT",
  ESTAGIO: "Estágio",
  TEMPORARIO: "Temporário",
  APRENDIZ: "Jovem aprendiz",
  PJ: "PJ",
};

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  FERIAS: "Férias",
  DOCUMENTO: "Documentos",
  ATUALIZACAO_CADASTRAL: "Atualização cadastral",
  JUSTIFICATIVA: "Justificativa",
  OUTROS: "Outros",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PENDENTE: "Pendente",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  CONCLUIDO: "Concluído",
};

export const PRIORITY_LABEL: Record<Priority, string> = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta" };

export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  CURRICULO: "Currículo",
  CONTRATO: "Contrato",
  IDENTIFICACAO: "Identificação",
  COMPROVANTE: "Comprovante",
  ATESTADO: "Atestado",
  CERTIFICADO: "Certificado",
  HOLERITE: "Holerite",
  OUTROS: "Outros",
};

export const DOC_STATUS_LABEL = {
  PENDENTE: "Pendente",
  ENVIADO: "Aguardando validação",
  VALIDADO: "Validado",
  RECUSADO: "Recusado",
} as const;

export const EMPLOYEE_STATUS_LABEL = { ATIVO: "Ativo", AFASTADO: "Afastado", DESLIGADO: "Desligado" } as const;

export const VACATION_STATUS_LABEL = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovadas",
  RECUSADO: "Recusadas",
  CANCELADO: "Canceladas",
} as const;

export const VACANCY_STATUS_LABEL = { RASCUNHO: "Rascunho", ABERTA: "Publicada", ENCERRADA: "Encerrada" } as const;

export const OUTCOME_LABEL = {
  EM_ANDAMENTO: "Em andamento",
  CONTRATADO: "Contratado",
  REPROVADO: "Não selecionado",
  DESISTIU: "Desistiu",
} as const;

export const ANNOUNCEMENT_PRIORITY_LABEL = { NORMAL: "Informativo", IMPORTANTE: "Importante", URGENTE: "Urgente" } as const;

/** Tons semânticos usados pelos badges do design system. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export const STATUS_TONE: Record<string, Tone> = {
  PENDENTE: "warning",
  EM_ANALISE: "info",
  APROVADO: "success",
  RECUSADO: "danger",
  CONCLUIDO: "neutral",
  CANCELADO: "neutral",
  ENVIADO: "info",
  VALIDADO: "success",
  ATIVO: "success",
  AFASTADO: "warning",
  DESLIGADO: "neutral",
  RASCUNHO: "neutral",
  ABERTA: "success",
  ENCERRADA: "neutral",
  ALTA: "danger",
  MEDIA: "warning",
  BAIXA: "neutral",
  NORMAL: "neutral",
  IMPORTANTE: "warning",
  URGENTE: "danger",
  EM_ANDAMENTO: "info",
  CONTRATADO: "success",
  REPROVADO: "neutral",
  DESISTIU: "neutral",
};
