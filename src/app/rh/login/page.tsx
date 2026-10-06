import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isDemoEnvironment } from "@/lib/public-data";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/rh/login">) {
  if (await getCurrentUser()) redirect("/rh");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const notice = sp.expirada ? "Sua sessão expirou. Entre novamente." : sp.saiu ? "Você saiu do sistema com segurança." : "";
  const demo = isDemoEnvironment();

  return (
    <main className="login">
      <section className="login__art blueprint on-dark">
        <Link href="/" className="backlink" style={{ color: "var(--navy-300)" }}>
          <ArrowLeft aria-hidden /> amscomponentes.com.br
        </Link>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-ams.png" alt="AMS Componentes" width={72} height={64} style={{ width: 72, height: "auto" }} />
          <h1>Área do colaborador AMS</h1>
          <p>Recrutamento, cadastro de funcionários, documentos, férias, solicitações e comunicados em um só lugar, com acesso por perfil e registro de cada ação.</p>
          <div className="login__mods" aria-hidden>
            <span>Recrutamento</span>
            <span>Funcionários</span>
            <span>Documentos</span>
            <span>Férias</span>
            <span>Solicitações</span>
            <span>Comunicados</span>
          </div>
        </div>
        <p className="mono" style={{ fontSize: "0.6875rem", letterSpacing: "0.1em", color: "var(--navy-400)" }}>
          ACESSO RESTRITO · USO MONITORADO
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-ams.png" alt="" className="login__tri" />
      </section>
      <section className="login__panel">
        <div style={{ maxWidth: 400, width: "100%", marginInline: "auto" }}>
          <span className="eyebrow">RH · Acesso</span>
          <h2 style={{ marginTop: 10 }}>Entrar</h2>
          <p className="small muted" style={{ margin: "8px 0 24px" }}>
            Use seu e-mail corporativo e senha.
          </p>
          {notice ? (
            <div className="notice" role="status" style={{ marginBottom: 16 }}>
              {notice}
            </div>
          ) : null}
          <LoginForm next={next} demo={demo} />
        </div>
      </section>
    </main>
  );
}
