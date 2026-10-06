import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="panel empty" style={{ marginTop: 40, padding: 56 }}>
      <span className="empty__icon">
        <ShieldX aria-hidden />
      </span>
      <strong>Acesso não permitido</strong>
      <p>Seu perfil não tem permissão para esta área. Se precisar do acesso, fale com o administrador do sistema.</p>
      <Link href="/rh" className="btn btn--outline" style={{ marginTop: 10 }}>
        Voltar ao painel
      </Link>
    </div>
  );
}
