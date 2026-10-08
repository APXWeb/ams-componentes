import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone, Globe2, Factory } from "lucide-react";
import { Suspense } from "react";
import { ContactForm, ContactFormFromUrl } from "@/components/site/public-forms";
import { products } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com a AMS Componentes: telefone ${SITE.phone}, WhatsApp ${SITE.whatsapp} e e-mails para vendas, indústria e exportação.`,
  alternates: { canonical: "/contato" },
};

const PRODUCT_NAMES = Object.fromEntries(products.map((p) => [p.slug, p.name]));

export default function ContatoPage() {
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
            <Suspense fallback={<ContactForm />}>
              <ContactFormFromUrl products={PRODUCT_NAMES} />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
