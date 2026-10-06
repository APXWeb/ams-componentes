import "server-only";
import { db, schema } from "@/db";
import { requestMeta, type CurrentUser } from "./auth";

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

export async function audit(
  actor: Pick<CurrentUser, "id" | "name"> | { id: null; name: string },
  action: AuditAction,
  summary: string,
  entity?: { type: string; id?: number | null },
) {
  const { ip } = await requestMeta();
  db.insert(schema.auditLogs)
    .values({
      userId: actor.id,
      actorLabel: actor.name,
      action,
      summary,
      entityType: entity?.type ?? null,
      entityId: entity?.id ?? null,
      ip,
    })
    .run();
}
