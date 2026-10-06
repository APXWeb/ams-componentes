import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone, Globe2, Factory } from "lucide-react";
import { ContactForm } from "@/components/site/public-forms";
import { productBySlug } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com a AMS Componentes: telefone ${SITE.phone}, WhatsApp ${SITE.whatsapp} e e-mails para vendas, indústria e exportação.`,
  alternates: { canonical: "/contato" },
};

export default async function ContatoPage({ searchParams }: PageProps<"/contato">) {
  const sp = await searchParams;
  const product = typeof sp.produto === "string" ? productBySlug(sp.produto)?.name : undefined;
  const items = [
    { icon: Phone, t: "Telefone", v: <a href={SITE.phoneHref}>{SITE.phone}</a> },
    { icon: MessageCircle, t: "WhatsApp", v: <a href={SITE.whatsappHref} target="_blank" rel="noopener">{SITE.whatsapp}</a> },
    { icon: Mail, t: "E-mail geral", v: <a href={`mailto:${SITE.emails.contato}`}>{SITE.emails.contato}</a> },
    { icon: Factory, t: "Indústria", v: <a href={`mailto:${SITE.emails.industria}`}>{SITE.emails.industria}</a> },
    { icon: Globe2, t: "Exportação", v: <a href={`mailto:${SITE.emails.exportacao}`}>{SITE.emails.exportacao}</a> },
    { icon: Clock, t: "Horário", v: SITE.hours },
    { icon: MapPin, t: "Localização", v: `${SITE.city}, ${SITE.state} · Brasil` },
  ];
  return (
    <>
      <section className="page-head page-head--light">
        <div className="container">
          <ol className="crumbs">
            <li>
              <Link href="/">Início</Link>
            </li>
            <li aria-current="page">Contato</li>
          </ol>
          <h1>Fale com a AMS</h1>
          <p className="lede">
            Atendemos distribuidores, indústria e exportação. Para compras no seu estado, consulte também nossos{" "}
            <Link href="/representantes" className="link">
              representantes
            </Link>
            .
          </p>
        </div>
      </section>
      <section className="section--tight">
        <div className="container contact-layout">
          <dl className="contact-list" style={{ margin: 0 }}>
            {items.map((x) => (
              <div key={x.t} className="contact-item">
                <span className="contact-item__icon">
                  <x.icon aria-hidden />
                </span>
                <div>
                  <dt>{x.t}</dt>
                  <dd style={{ overflowWrap: "anywhere" }}>{x.v}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="form-card ticks">
            <h2 style={{ fontSize: "var(--fs-xl)", marginBottom: 6 }}>Envie uma mensagem</h2>
            <p className="small muted" style={{ marginBottom: 22 }}>
              Respondemos pelo e-mail informado, em horário comercial.
            </p>
            <ContactForm product={product} />
          </div>
        </div>
      </section>
    </>
  );
}
