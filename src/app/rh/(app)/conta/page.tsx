import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { KeyRound, MonitorSmartphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/rh/ui";
import { Panel } from "@/components/ui/bits";
import { ActionForm } from "@/components/ui/modal";
import { SubmitButton, TextField } from "@/components/ui/form";
import { ROLE_LABEL } from "@/lib/permissions";
import { PASSWORD_RULES } from "@/lib/password";
import { fmtDateTime, relative } from "@/lib/format";
import { changeOwnPassword } from "../usuarios/actions";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const user = await requireUser();
  const u = db.select().from(schema.users).where(eq(schema.users.id, user.id)).get()!;
  const sessions = db.select().from(schema.sessions).where(eq(schema.sessions.userId, user.id)).all();
  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader eyebrow="Segurança" title="Minha conta" description={`${u.email} · perfil ${ROLE_LABEL[u.role]}`} />
      <div className="grid grid-2">
        <Panel title="Alterar senha" icon={KeyRound}>
          <ActionForm action={changeOwnPassword} className="stack" resetOnSuccess>
            <TextField label="Senha atual" name="current" type="password" autoComplete="current-password" />
            <TextField label="Nova senha" name="next" type="password" autoComplete="new-password" hint={PASSWORD_RULES} />
            <TextField label="Repita a nova senha" name="confirm" type="password" autoComplete="new-password" />
            <SubmitButton className="btn">Alterar senha</SubmitButton>
          </ActionForm>
          <p className="xsmall subtle" style={{ marginTop: 14 }}>
            Última alteração: {u.passwordChangedAt ? fmtDateTime(u.passwordChangedAt) : "senha provisória ou de cadastro"}.
          </p>
        </Panel>
        <Panel title="Sessões ativas" icon={MonitorSmartphone} bodyClass="">
          <ul className="list">
            {sessions.map((s) => (
              <li key={s.id} className="list-item">
                <span className="list-item__main">
                  <span className="list-item__title">
                    {s.id === user.sessionId ? "Esta sessão" : "Outra sessão"} · {s.ip}
                  </span>
                  <span className="list-item__sub" title={s.userAgent ?? ""}>
                    Ativa {relative(s.lastSeenAt)} · expira {fmtDateTime(s.expiresAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="xsmall subtle" style={{ padding: "12px 18px" }}>
            Sessões expiram após 10 horas ou 1 hora sem uso.
          </p>
        </Panel>
      </div>
    </div>
  );
}
