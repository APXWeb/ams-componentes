"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { FormErrorsContext, PendingContext, SubmitButton, TextField, useFormAction } from "@/components/ui/form";
import { login } from "../auth-actions";

// Contas do ambiente de demonstração (criadas por scripts/db-setup.ts). Só aparecem com dados demo.
const DEMO = [
  { email: "admin@ams.example", role: "Administrador", hint: "Acesso completo" },
  { email: "rh@ams.example", role: "RH", hint: "Mariana Campos" },
  { email: "gestor@ams.example", role: "Gestor", hint: "Produção" },
  { email: "funcionario@ams.example", role: "Funcionário", hint: "Operador" },
];
const DEMO_PASSWORD = "Ams@demo2026";

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const { state, onSubmit, pending } = useFormAction(login, { toast: false });
  const [show, setShow] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const fill = (email: string) => {
    const f = formRef.current;
    if (!f) return;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("password") as HTMLInputElement).value = DEMO_PASSWORD;
    f.requestSubmit();
  };

  return (
    <>
      <PendingContext.Provider value={pending}>
        <form ref={formRef} onSubmit={onSubmit} noValidate className="stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <FormErrorsContext.Provider value={state.fieldErrors ?? {}}>
            <input type="hidden" name="next" value={next} />
            {state.message && !state.ok ? (
              <div className="notice notice--danger" role="alert">
                {state.message}
              </div>
            ) : null}
            <TextField label="E-mail" name="email" type="email" autoComplete="username" autoFocus />
            <div style={{ position: "relative" }}>
              <TextField label="Senha" name="password" type={show ? "text" : "password"} autoComplete="current-password" />
              <button
                type="button"
                className="btn btn--ghost btn--icon btn--sm"
                style={{ position: "absolute", right: 5, top: 30 }}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={show}
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </button>
            </div>
            <SubmitButton className="btn btn--lg btn--block">
              <LogIn aria-hidden /> Entrar
            </SubmitButton>
            <p className="xsmall subtle">Esqueceu a senha? Fale com o administrador do sistema ou com o RH.</p>
          </FormErrorsContext.Provider>
        </form>
      </PendingContext.Provider>

      {demo ? (
        <div className="demo-accounts">
          <span className="demo-pill">Demonstração</span>
          <p className="xsmall muted" style={{ marginTop: 8 }}>
            Entre com um perfil para ver o que cada usuário acessa. Senha de todos: <code className="mono">{DEMO_PASSWORD}</code>
          </p>
          <div className="demo-accounts__grid">
            {DEMO.map((d) => (
              <button key={d.email} type="button" className="demo-acc" onClick={() => fill(d.email)} disabled={pending}>
                <strong>{d.role}</strong>
                <span>{d.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
