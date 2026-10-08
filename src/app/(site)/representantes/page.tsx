import type { Metadata } from "next";
import Link from "next/link";
import { Factory, Globe2, Phone, Mail } from "lucide-react";
import { Suspense } from "react";
import { RepMap, RepMapFromUrl } from "@/components/site/rep-map";
import { SITE, STATES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Representantes",
  description: "Encontre o representante comercial da AMS Componentes no seu estado. Clientes da indústria e exportação são atendidos diretamente pela fábrica.",
  alternates: { canonical: "/representantes" },
};

export default function RepresentantesPage() {
  const direct = (
    <dl className="stack small" style={{ "--gap": "6px", margin: 0 } as React.CSSProperties}>
      <div>
        <Phone size={14} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} />{" "}
        <a className="link" href={SITE.phoneHref}>
          {SITE.phone}
        </a>{" "}
        · {SITE.salesContact}
      </div>
      <div>
        <Mail size={14} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} />{" "}
        <a className="link" href={`mailto:${SITE.emails.vendas}`}>
          {SITE.emails.vendas}
        </a>
      </div>
    </dl>
  );

  return (
    <>
      <section className="page-head page-head--light">
        <div className="container">
          <ol className="crumbs">
            <li>
              <Link href="/">Início</Link>
            </li>
            <li aria-current="page">Representantes</li>
          </ol>
          <h1>Representantes em todo o país</h1>
          <p className="lede">Escolha o estado no mapa ou na lista para ver o contato do representante comercial AMS.</p>
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          <Suspense fallback={<RepMap states={STATES} initial="SP" directContact={direct} />}>
            <RepMapFromUrl states={STATES} directContact={direct} />
          </Suspense>
        </div>
      </section>

      <section className="section--tight section--sunken">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 28 }}>
            <span className="eyebrow">Atendimento direto</span>
            <h2 style={{ fontSize: "var(--fs-2xl)" }}>Indústria e exportação falam direto com a AMS.</h2>
          </div>
          <div className="two-col">
            <dl className="contact-list" style={{ margin: 0 }}>
              <div className="contact-item">
                <span className="contact-item__icon">
                  <Factory aria-hidden />
                </span>
                <div>
                  <dt>Clientes indústria</dt>
                  <dd>
                    <a className="link" href={`mailto:${SITE.emails.industria}`}>
                      {SITE.emails.industria}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-item__icon">
                  <Globe2 aria-hidden />
                </span>
                <div>
                  <dt>Exportação</dt>
                  <dd>
                    <a className="link" href={`mailto:${SITE.emails.exportacao}`}>
                      {SITE.emails.exportacao}
                    </a>
                  </dd>
                </div>
              </div>
            </dl>
            <dl className="contact-list" style={{ margin: 0 }}>
              <div className="contact-item">
                <span className="contact-item__icon">
                  <Phone aria-hidden />
                </span>
                <div>
                  <dt>Vendas · {SITE.salesContact}</dt>
                  <dd>
                    <a className="link" href={SITE.phoneHref}>
                      {SITE.phone}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-item__icon">
                  <Mail aria-hidden />
                </span>
                <div>
                  <dt>E-mail de vendas</dt>
                  <dd>
                    <a className="link" href={`mailto:${SITE.emails.vendas}`}>
                      {SITE.emails.vendas}
                    </a>
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
