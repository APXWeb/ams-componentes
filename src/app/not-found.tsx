import Link from "next/link";
import "./(site)/site.css";

export default function NotFound() {
  return (
    <main className="blueprint on-dark" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 520 }}>
        <span className="eyebrow">Erro 404</span>
        <h1 style={{ color: "#fff", fontSize: "var(--fs-3xl)", margin: "16px 0" }}>Página não encontrada.</h1>
        <p style={{ color: "var(--navy-200)", marginBottom: 28 }}>O endereço pode ter mudado com o novo site. Use os atalhos abaixo para continuar.</p>
        <div className="row wrap">
          <Link href="/" className="btn btn--signal">
            Ir para o início
          </Link>
          <Link href="/produtos" className="btn btn--on-dark">
            Ver produtos
          </Link>
        </div>
      </div>
    </main>
  );
}
