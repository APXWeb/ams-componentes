import type { CurrentUser, DemoData } from "./types";

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FALHOU"
  | "LOGOUT"
  | "CRIACAO"
  | "EDICAO"
  | "EXCLUSAO"
  | "DESATIVACAO"
  | "MUDANCA_ETAPA"
  | "CONTRATACAO"
  | "APROVACAO"
  | "RECUSA"
  | "UPLOAD"
  | "DOWNLOAD"
  | "PERMISSAO"
  | "PUBLICACAO"
  | "CANDIDATURA";

export const AUDIT_LABEL: Record<AuditAction, string> = {
  LOGIN: "Login",
  LOGIN_FALHOU: "Login recusado",
  LOGOUT: "Logout",
  CRIACAO: "Criação",
  EDICAO: "Edição",
  EXCLUSAO: "Exclusão",
  DESATIVACAO: "Desativação",
  MUDANCA_ETAPA: "Mudança de etapa",
  CONTRATACAO: "Contratação",
  APROVACAO: "Aprovação",
  RECUSA: "Recusa",
  UPLOAD: "Upload",
  DOWNLOAD: "Acesso a arquivo",
  PERMISSAO: "Alteração de permissão",
  PUBLICACAO: "Publicação",
  CANDIDATURA: "Candidatura recebida",
};

/** Registra uma ação na trilha de auditoria. Chamar dentro de mutate(). */
export function audit(
  d: DemoData,
  actor: Pick<CurrentUser, "id" | "name"> | { id: null; name: string },
  action: AuditAction,
  summary: string,
  entity?: { type: string; id?: number | null },
) {
  d.seq.auditLogs = (d.seq.auditLogs ?? 0) + 1;
  d.auditLogs.push({
    id: d.seq.auditLogs,
    userId: actor.id,
    actorLabel: actor.name,
    action,
    summary,
    entityType: entity?.type ?? null,
    entityId: entity?.id ?? null,
    ip: "navegador",
    createdAt: new Date().toISOString(),
  });
}
