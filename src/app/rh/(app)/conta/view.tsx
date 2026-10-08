"use client";

import { KeyRound, MonitorSmartphone, Info } from "lucide-react";
import { PageHeader } from "@/components/rh/ui";
import { Panel } from "@/components/ui/bits";
import { ActionForm } from "@/components/ui/modal";
import { SubmitButton, TextField } from "@/components/ui/form";
import { useRh } from "@/components/rh/demo-app";
import { ROLE_LABEL } from "@/lib/permissions";
import { userById } from "@/lib/demo/queries";
import { changeOwnPassword, PASSWORD_RULES } from "@/lib/demo/actions/admin";
import { fmtDateTime } from "@/lib/format";

export function ContaView() {
  const { d, user } = useRh();
  const u = userById(d, user.id)!;
  const agent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = /Edg\//.test(agent) ? "Microsoft Edge" : /Chrome\//.test(agent) ? "Google Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "Navegador";
  const device = /Mobi|Android|iPhone/.test(agent) ? "celular" : "computador";

  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader eyebrow="Segurança" title="Minha conta" description={`${u.email} · perfil ${ROLE_LABEL[u.role]}`} />
      <div className="notice" style={{ marginBottom: 16 }}>
        <Info aria-hidden />
        <span>Ambiente de demonstração: o acesso é simulado e nenhuma senha é verificada ou armazenada.</span>
      </div>
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
            <li className="list-item">
              <span className="list-item__main">
                <span className="list-item__title">Esta sessão · {browser} no {device}</span>
                <span className="list-item__sub">Ativa agora · último acesso {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "hoje"}</span>
              </span>
            </li>
          </ul>
          <p className="xsmall subtle" style={{ padding: "12px 18px" }}>
            Na versão real, sessões expiram após 10 horas ou 1 hora sem uso.
          </p>
        </Panel>
      </div>
    </div>
  );
}
