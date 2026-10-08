"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, Info } from "lucide-react";
import { Avatar } from "@/components/ui/bits";
import { useToast } from "@/components/ui/toast";
import { DEMO_PERSONAS } from "@/lib/demo/seed";
import { getData, latency, signIn } from "@/lib/demo/store";

/**
 * Login de DEMONSTRAÇÃO: não há autenticação. O visitante escolhe um perfil (ou digita qualquer
 * e-mail e senha) e entra no sistema com os dados fictícios daquele perfil.
 */
export function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const [persona, setPersona] = useState(DEMO_PERSONAS[0]);
  const [email, setEmail] = useState(DEMO_PERSONAS[0].email);
  const [password, setPassword] = useState("demonstracao");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ email?: string; password?: string }>({});
  const notice = sp.get("saiu") ? "Você saiu da demonstração. Escolha um perfil para entrar de novo." : "";

  const choose = (p: (typeof DEMO_PERSONAS)[number]) => {
    setPersona(p);
    setEmail(p.email);
    setPassword("demonstracao");
    setError({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = {
      ...(/^\S+@\S+\.\S+$/.test(email.trim()) ? {} : { email: "Informe um e-mail válido." }),
      ...(password ? {} : { password: "Informe a senha." }),
    };
    setError(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    await latency(700, 1000);
    // um e-mail de perfil da demo entra com aquele perfil; qualquer outro entra como o perfil selecionado
    const match = getData().users.find((u) => u.email === email.trim().toLowerCase() && u.active);
    const userId = match?.id ?? persona.userId;
    signIn(userId);
    toast(`Bem-vindo(a), ${(match?.name ?? persona.person).split(" ")[0]}. Você está na demonstração como ${DEMO_PERSONAS.find((p) => p.userId === userId)?.title ?? "usuário"}.`);
    router.push("/rh");
  };

  return (
    <>
      <span className="eyebrow">RH · Acesso</span>
      <h2 style={{ marginTop: 10 }}>Entrar na demonstração</h2>
      <p className="small muted" style={{ margin: "8px 0 20px" }}>
        Escolha um perfil para ver o que cada pessoa acessa no sistema.
      </p>
      {notice ? (
        <div className="notice" role="status" style={{ marginBottom: 16 }}>
          {notice}
        </div>
      ) : null}

      <div className="persona-grid" role="group" aria-label="Perfis de demonstração" style={{ marginBottom: 20 }}>
        {DEMO_PERSONAS.map((p) => (
          <button key={p.userId} type="button" className="persona" aria-pressed={persona.userId === p.userId} onClick={() => choose(p)} disabled={pending}>
            <Avatar name={p.person} size="sm" />
            <span className="persona__main">
              <strong>{p.title}</strong>
              <span>
                {p.person === "Administrador do Sistema" ? p.detail : p.person}
              </span>
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate className="stack" style={{ "--gap": "16px" } as React.CSSProperties}>
        <div className="field">
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error.email ? true : undefined} aria-describedby={error.email ? "email-error" : undefined} />
          {error.email ? (
            <span className="field-error" id="email-error" role="alert">
              {error.email}
            </span>
          ) : null}
        </div>
        <div className="field" style={{ position: "relative" }}>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input id="password" className="input" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={error.password ? true : undefined} />
          <button type="button" className="btn btn--ghost btn--icon btn--sm" style={{ position: "absolute", right: 5, top: 30 }} aria-label={show ? "Ocultar senha" : "Mostrar senha"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
            {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
          {error.password ? (
            <span className="field-error" role="alert">
              {error.password}
            </span>
          ) : null}
        </div>
        <button type="submit" className={`btn btn--lg btn--block ${pending ? "is-loading" : ""}`} aria-busy={pending} disabled={pending}>
          <LogIn aria-hidden /> {pending ? "Entrando…" : `Entrar como ${persona.title}`}
        </button>
      </form>

      <p className="xsmall subtle row" style={{ "--gap": "6px", alignItems: "flex-start", marginTop: 18 } as React.CSSProperties}>
        <Info size={14} aria-hidden style={{ flex: "none", marginTop: 2 }} />
        Sistema de demonstração com dados fictícios. Não há verificação de senha e nada é enviado para fora do navegador.
      </p>
    </>
  );
}
