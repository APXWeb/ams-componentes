import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacidade e LGPD",
  description: "Como a AMS Componentes trata dados pessoais enviados pelo site, pelo formulário de contato e pelas candidaturas do Trabalhe Conosco.",
  alternates: { canonical: "/privacidade" },
};

/*
 * MINUTA: texto redigido para o novo site e o sistema de RH. Deve ser validado pelo jurídico
 * da AMS (controlador, encarregado/DPO e prazos) antes da publicação definitiva.
 */
export default function PrivacidadePage() {
  return (
    <>
      <section className="page-head page-head--light">
        <div className="container">
          <ol className="crumbs">
            <li>
              <Link href="/">Início</Link>
            </li>
            <li aria-current="page">Privacidade</li>
          </ol>
          <h1>Privacidade e proteção de dados</h1>
          <p className="lede">Como tratamos os dados pessoais recebidos por este site, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
        </div>
      </section>
      <section className="section--tight">
        <div className="container prose" style={{ maxWidth: 780 }}>
          <h2>Quem trata os dados</h2>
          <p>
            {SITE.legalName} ({SITE.name}), com sede em {SITE.city}, {SITE.state}. Dúvidas e solicitações sobre seus dados podem ser enviadas para{" "}
            <a className="link" href={`mailto:${SITE.emails.contato}`}>
              {SITE.emails.contato}
            </a>
            .
          </p>

          <h2>Formulário de contato</h2>
          <ul>
            <li>Coletamos nome, e-mail, telefone e cidade (opcionais) e a mensagem enviada.</li>
            <li>Usamos esses dados apenas para responder ao seu contato comercial.</li>
            <li>Não vendemos nem compartilhamos esses dados para fins de marketing de terceiros.</li>
          </ul>

          <h2 id="candidatos">Candidaturas (Trabalhe Conosco)</h2>
          <ul>
            <li>Coletamos nome, e-mail, telefone, cidade, currículo e a mensagem opcional, com base no seu consentimento.</li>
            <li>Os dados são usados exclusivamente nos processos seletivos da AMS e acessados somente pela equipe de RH e pelos gestores envolvidos no processo.</li>
            <li>Currículos ficam em armazenamento privado, sem endereço público, e cada acesso é registrado.</li>
            <li>Mantemos a candidatura por até 12 meses após o envio. Depois disso, os dados são excluídos ou anonimizados, salvo se você for contratado.</li>
            <li>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail acima.</li>
          </ul>

          <h2>Área do colaborador</h2>
          <ul>
            <li>O acesso é restrito a colaboradores autorizados, com login individual e perfis de permissão.</li>
            <li>Ações relevantes (login, alterações, aprovações, envio e acesso a documentos) ficam registradas em trilha de auditoria.</li>
          </ul>

          <h2>Cookies</h2>
          <p>O site institucional não usa cookies de rastreamento próprios. A área do colaborador usa apenas um cookie de sessão, essencial para o login.</p>
        </div>
      </section>
    </>
  );
}
