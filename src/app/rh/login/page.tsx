import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "./login-form";
import { asset } from "@/lib/asset";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="login">
      <section className="login__art on-dark" style={{ "--login-photo": `url("${asset("/img/fabrica-producao.webp")}")` } as React.CSSProperties}>
        <Link href="/" className="backlink" style={{ color: "var(--navy-200)" }}>
          <ArrowLeft aria-hidden /> Voltar ao site
        </Link>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/img/logo-ams.png")} alt="AMS Componentes" width={72} height={64} style={{ width: 72, height: "auto" }} />
          <h1>Área do colaborador AMS</h1>
          <p>Recrutamento, funcionários, documentos, férias, solicitações e comunicados em um só lugar, com acesso por perfil e registro de cada ação.</p>
          <div className="login__mods" aria-hidden>
            <span>Recrutamento</span>
            <span>Funcionários</span>
            <span>Documentos</span>
            <span>Férias</span>
            <span>Solicitações</span>
            <span>Comunicados</span>
          </div>
        </div>
        <p className="login__credit">Projeto conceitual desenvolvido pela APX Web para a AMS Componentes.</p>
      </section>
      <section className="login__panel">
        <div style={{ maxWidth: 440, width: "100%", marginInline: "auto" }}>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
