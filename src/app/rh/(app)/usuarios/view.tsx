"use client";

import { useSearchParams } from "next/navigation";
import { KeyRound, Lock, Unlock, UserPlus, RotateCcw, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/rh/ui";
import { Avatar, Badge } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { SelectField, TextField } from "@/components/ui/form";
import { Guard, useRh } from "@/components/rh/demo-app";
import { PERMISSIONS, ROLE_LABEL } from "@/lib/permissions";
import { employee } from "@/lib/demo/queries";
import { createUser, resetPassword, toggleUser, updateUserRole } from "@/lib/demo/actions/admin";
import { ROLES } from "@/lib/demo/types";
import { fmtDateTime } from "@/lib/format";

const PERM_LABEL: Partial<Record<keyof typeof PERMISSIONS, string>> = {
  "employees.view_all": "Ver todos os funcionários",
  "employees.view_team": "Ver a própria equipe",
  "employees.manage": "Cadastrar e editar funcionários",
  "recruitment.view": "Acompanhar recrutamento",
  "recruitment.manage": "Gerir vagas e candidatos",
  "documents.manage": "Gerir documentos",
  "vacations.manage": "Aprovar férias",
  "requests.manage": "Responder solicitações",
  "announcements.manage": "Publicar comunicados",
  "indicators.view": "Ver indicadores",
  "audit.view": "Ver auditoria",
  "users.manage": "Gerir usuários e permissões",
};

export function UsuariosView() {
  return (
    <Guard anyOf={["users.manage"]}>
      <Usuarios />
    </Guard>
  );
}

function Usuarios() {
  const { d, user: me } = useRh();
  const sp = useSearchParams();
  const users = [...d.users].sort((a, b) => a.name.localeCompare(b.name));
  const withoutAccess = d.employees
    .filter((e) => e.status !== "DESLIGADO" && !d.users.some((u) => u.employeeId === e.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({ value: e.id, label: e.name, email: e.corporateEmail }));
  const pre = withoutAccess.find((w) => w.value === (Number(sp.get("novo")) || 0));
  const roleOpts = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Usuários e acessos"
        description="Quem acessa o sistema e com qual perfil. Toda alteração de permissão fica registrada na auditoria."
        actions={
          <ActionModal
            trigger={
              <>
                <UserPlus aria-hidden /> Novo acesso
              </>
            }
            triggerClass="btn"
            title="Criar acesso"
            description="Uma senha provisória é gerada e exibida uma única vez."
            action={createUser}
            submitLabel="Criar acesso"
            autoOpen={!!pre}
          >
            <SelectField label="Funcionário" name="employeeId" optional placeholder="Sem vínculo (somente Admin/RH externo)" options={withoutAccess.map((w) => ({ value: w.value, label: w.label }))} defaultValue={pre?.value ?? ""} />
            <TextField label="Nome" name="name" defaultValue={pre?.label} />
            <TextField label="E-mail de login" name="email" type="email" defaultValue={pre?.email} />
            <SelectField label="Perfil" name="role" defaultValue="FUNCIONARIO" options={roleOpts} />
          </ActionModal>
        }
      />
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="table-wrap">
          <table className="table table--stack">
            <thead>
              <tr>
                <th scope="col">Usuário</th>
                <th scope="col">Perfil</th>
                <th scope="col">Funcionário</th>
                <th scope="col">Situação</th>
                <th scope="col">Último acesso</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const emp = employee(d, u.employeeId);
                return (
                  <tr key={u.id}>
                    <td className="cell-main">
                      <span className="cell-person">
                        <Avatar name={u.name} photo={emp?.photo} size="sm" />
                        <span>
                          <b>
                            {u.name} {u.id === me.id ? <span className="subtle">(você)</span> : null}
                          </b>
                          <small>{u.email}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Perfil">
                      <Badge tone={u.role === "ADMIN" ? "brand" : u.role === "RH" ? "info" : "neutral"} plain>
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </td>
                    <td data-label="Funcionário">{emp?.name ?? <span className="subtle">—</span>}</td>
                    <td data-label="Situação">{!u.active ? <Badge>Bloqueado</Badge> : <Badge tone="success">Ativo</Badge>}</td>
                    <td data-label="Último acesso" className="nowrap subtle">
                      {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "Nunca"}
                    </td>
                    <td>
                      <div className="row" style={{ "--gap": "4px", justifyContent: "flex-end" } as React.CSSProperties}>
                        <ActionModal trigger={<KeyRound aria-hidden />} triggerClass="btn btn--ghost btn--sm btn--icon" title={`Perfil de ${u.name}`} description="O novo perfil vale a partir do próximo acesso." action={updateUserRole} submitLabel="Salvar perfil" hidden={{ id: u.id }}>
                          <SelectField label="Perfil" name="role" defaultValue={u.role} options={roleOpts} />
                        </ActionModal>
                        <ActionModal trigger={<RotateCcw aria-hidden />} triggerClass="btn btn--ghost btn--sm btn--icon" title="Redefinir senha" description={`Gera uma senha provisória para ${u.email}.`} action={resetPassword} submitLabel="Gerar nova senha" hidden={{ id: u.id }} />
                        {u.id !== me.id ? (
                          <ActionModal
                            trigger={u.active ? <Lock aria-hidden /> : <Unlock aria-hidden />}
                            triggerClass={`btn btn--sm btn--icon ${u.active ? "btn--danger-outline" : "btn--outline"}`}
                            title={u.active ? "Bloquear acesso" : "Reativar acesso"}
                            description={u.active ? `${u.name} não conseguirá mais entrar no sistema.` : `${u.name} volta a ter acesso.`}
                            action={toggleUser}
                            submitLabel={u.active ? "Bloquear" : "Reativar"}
                            submitClass={u.active ? "btn btn--danger" : "btn"}
                            hidden={{ id: u.id }}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">
            <ShieldAlert aria-hidden /> Matriz de permissões
          </h2>
          <span className="xsmall subtle">O que cada perfil pode ver e fazer</span>
        </header>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Permissão</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" style={{ textAlign: "center" }}>
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PERM_LABEL) as (keyof typeof PERMISSIONS)[]).map((p) => (
                <tr key={p}>
                  <td>{PERM_LABEL[p]}</td>
                  {ROLES.map((r) => (
                    <td key={r} style={{ textAlign: "center" }}>
                      {(PERMISSIONS[p] as readonly string[]).includes(r) ? (
                        <span aria-label="sim" style={{ color: "var(--success)", fontWeight: 700 }}>
                          ●
                        </span>
                      ) : (
                        <span aria-label="não" className="subtle">
                          ·
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td>Próprio perfil, documentos, férias, solicitações e comunicados</td>
                {ROLES.map((r) => (
                  <td key={r} style={{ textAlign: "center", color: "var(--success)", fontWeight: 700 }} aria-label="sim">
                    ●
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
