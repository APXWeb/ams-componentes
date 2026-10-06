import type { Metadata } from "next";
import { asc, eq, isNull } from "drizzle-orm";
import { KeyRound, Lock, Unlock, UserPlus, RotateCcw, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { ROLES } from "@/db/schema";
import { PageHeader } from "@/components/rh/ui";
import { Badge } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { SelectField, TextField } from "@/components/ui/form";
import { PERMISSIONS, ROLE_LABEL } from "@/lib/permissions";
import { fmtDateTime, isFuture } from "@/lib/format";
import { createUser, resetPassword, toggleUser, updateUserRole } from "./actions";

export const metadata: Metadata = { title: "Usuários e acessos" };

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

export default async function UsuariosPage({ searchParams }: PageProps<"/rh/usuarios">) {
  const me = await requireUser("users.manage");
  const sp = await searchParams;
  const users = db
    .select({ u: schema.users, emp: schema.employees.name })
    .from(schema.users)
    .leftJoin(schema.employees, eq(schema.employees.id, schema.users.employeeId))
    .orderBy(asc(schema.users.name))
    .all();
  const withoutAccess = db
    .select({ value: schema.employees.id, label: schema.employees.name, email: schema.employees.corporateEmail })
    .from(schema.employees)
    .leftJoin(schema.users, eq(schema.users.employeeId, schema.employees.id))
    .where(isNull(schema.users.id))
    .orderBy(asc(schema.employees.name))
    .all();
  const preselect = Number(sp.novo) || 0;
  const pre = withoutAccess.find((w) => w.value === preselect);
  const roleOpts = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Usuários e acessos"
        description="Quem acessa o sistema e com qual perfil. Toda alteração de permissão é auditada e encerra as sessões do usuário."
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
              {users.map(({ u, emp }) => {
                const locked = isFuture(u.lockedUntil);
                return (
                  <tr key={u.id}>
                    <td className="cell-main">
                      <span className="cell-person">
                        <span className="avatar avatar--sm" aria-hidden>
                          {u.name
                            .split(" ")
                            .map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : ""))
                            .join("")}
                        </span>
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
                    <td data-label="Funcionário">{emp ?? <span className="subtle">—</span>}</td>
                    <td data-label="Situação">{!u.active ? <Badge>Bloqueado</Badge> : locked ? <Badge tone="warning">Travado por tentativas</Badge> : <Badge tone="success">Ativo</Badge>}</td>
                    <td data-label="Último acesso" className="nowrap subtle">
                      {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "Nunca"}
                    </td>
                    <td>
                      <div className="row" style={{ "--gap": "4px", justifyContent: "flex-end" } as React.CSSProperties}>
                        <ActionModal
                          trigger={<KeyRound aria-hidden />}
                          triggerClass="btn btn--ghost btn--sm btn--icon"
                          title={`Perfil de ${u.name}`}
                          description="As sessões abertas do usuário serão encerradas."
                          action={updateUserRole}
                          submitLabel="Salvar perfil"
                          hidden={{ id: u.id }}
                        >
                          <SelectField label="Perfil" name="role" defaultValue={u.role} options={roleOpts} />
                        </ActionModal>
                        <ActionModal
                          trigger={<RotateCcw aria-hidden />}
                          triggerClass="btn btn--ghost btn--sm btn--icon"
                          title="Redefinir senha"
                          description={`Gera uma senha provisória para ${u.email} e encerra as sessões abertas.`}
                          action={resetPassword}
                          submitLabel="Gerar nova senha"
                          hidden={{ id: u.id }}
                        />
                        {u.id !== me.id ? (
                          <ActionModal
                            trigger={u.active ? <Lock aria-hidden /> : <Unlock aria-hidden />}
                            triggerClass={`btn btn--sm btn--icon ${u.active ? "btn--danger-outline" : "btn--outline"}`}
                            title={u.active ? "Bloquear acesso" : "Reativar acesso"}
                            description={u.active ? `${u.name} não conseguirá mais entrar. As sessões abertas serão encerradas.` : `${u.name} volta a ter acesso com a senha atual.`}
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
          <span className="xsmall subtle">Aplicada no servidor em cada página, ação e arquivo</span>
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
                      {(PERMISSIONS[p] as readonly string[]).includes(r) ? <span aria-label="sim" style={{ color: "var(--success)", fontWeight: 700 }}>●</span> : <span aria-label="não" className="subtle">·</span>}
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
