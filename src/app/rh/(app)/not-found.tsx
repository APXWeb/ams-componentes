import Link from "next/link";
import { SearchX } from "lucide-react";

export default function RhNotFound() {
  return (
    <div className="panel empty" style={{ marginTop: 40, padding: 56 }}>
      <span className="empty__icon">
        <SearchX aria-hidden />
      </span>
      <strong>Registro não encontrado</strong>
      <p>O item pode ter sido removido ou não está disponível para o seu perfil.</p>
      <Link href="/rh" className="btn btn--outline" style={{ marginTop: 10 }}>
        Voltar ao painel
      </Link>
    </div>
  );
}
