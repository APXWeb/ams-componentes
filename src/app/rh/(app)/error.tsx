"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function RhError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="panel empty" style={{ marginTop: 40, padding: 56 }} role="alert">
      <span className="empty__icon" style={{ color: "var(--danger)" }}>
        <TriangleAlert aria-hidden />
      </span>
      <strong>Algo deu errado ao carregar esta tela</strong>
      <p>Nenhum dado foi perdido. Tente novamente; se o problema continuar, informe o código abaixo ao suporte.</p>
      {error.digest ? <code className="mono xsmall subtle">{error.digest}</code> : null}
      <button type="button" className="btn" onClick={reset} style={{ marginTop: 10 }}>
        Tentar novamente
      </button>
    </div>
  );
}
