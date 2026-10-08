import type { Role } from "@/lib/demo/types";

/*
 * Matriz de permissões por perfil. Na demonstração, as telas, as ações e o menu consultam `can()`;
 * na versão real, a mesma matriz seria aplicada pelo backend em cada rota da API.
 */
export const PERMISSIONS = {
  "dashboard.rh": ["ADMIN", "RH"],
  "dashboard.team": ["GESTOR"],
  "employees.view_all": ["ADMIN", "RH"],
  "employees.view_team": ["GESTOR"],
  "employees.manage": ["ADMIN", "RH"],
  "recruitment.view": ["ADMIN", "RH", "GESTOR"],
  "recruitment.manage": ["ADMIN", "RH"],
  "documents.manage": ["ADMIN", "RH"],
  "vacations.manage": ["ADMIN", "RH"],
  "vacations.view_team": ["GESTOR"],
  "requests.manage": ["ADMIN", "RH"],
  "requests.view_team": ["GESTOR"],
  "announcements.manage": ["ADMIN", "RH"],
  "indicators.view": ["ADMIN", "RH"],
  "audit.view": ["ADMIN"],
  "users.manage": ["ADMIN"],
  "messages.view": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  RH: "Recursos Humanos",
  GESTOR: "Gestor",
  FUNCIONARIO: "Funcionário",
};
