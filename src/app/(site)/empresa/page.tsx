import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Factory, FlaskConical, Sparkles } from "lucide-react";
import { ABOUT, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Empresa",
  description: `Fundada em ${SITE.founded} em Cotia (SP), a AMS Componentes é líder nacional na fabricação de fusíveis automotivos, com laboratório próprio de testes e controle de qualidade.`,
  alternates: { canonical: "/empresa" },
};

export default function EmpresaPage() {
  const years = new Date().getFullYear() - SITE.founded;
  return (
    <>
      <section className="page-head blueprint on-dark">
        <div className="container">
          <ol className="crumbs">
            <li>
              <Link href="/">Início</Link>
            </li>
            <li aria-current="page">Empresa</li>
          </ol>
          <h1>{ABOUT.headline}.</h1>
          <p className="lede">{ABOUT.intro}</p>
        </div>
      </section>

      <section className="section">
        <div className="container about-split">
          <div data-reveal>
            <span className="eyebrow">Nossa história</span>
            <h2 className="section-title" style={{ marginTop: 14 }}>
              Desde {SITE.founded}.
            </h2>
            <p className="lede" style={{ marginTop: 18 }}>
              {ABOUT.history}
            </p>
            <p className="lede" style={{ marginTop: 14 }}>
              {ABOUT.location}
            </p>
            <dl className="facts">
              <div className="fact">
                <dt>Fundação</dt>
                <dd>{SITE.founded}</dd>
              </div>
              <div className="fact">
                <dt>Fundador</dt>
                <dd>{SITE.founder}, sócio-diretor</dd>
              </div>
              <div className="fact">
                <dt>Matriz</dt>
                <dd>
                  {SITE.city}, {SITE.state} · {SITE.region}
                </dd>
              </div>
              <div className="fact">
                <dt>Trajetória</dt>
                <dd>{years} anos de fabricação nacional</dd>
              </div>
            </dl>
          </div>
          <div className="photo-stack" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
            <figure>
              <Image src="/img/fabrica-aerea.webp" alt="Vista aérea da matriz da AMS Componentes em Cotia, SP" width={940} height={381} sizes="(max-width: 900px) 100vw, 50vw" priority />
              <figcaption>MATRIZ · COTIA, SP</figcaption>
            </figure>
            <figure>
              <Image src="/img/fabrica-interna-1.webp" alt="Máquinas na área de produção" width={305} height={206} sizes="18vw" />
            </figure>
            <figure>
              <Image src="/img/fabrica-interna-2.webp" alt="Prensas na área de produção" width={310} height={206} sizes="18vw" />
            </figure>
            <figure>
              <Image src="/img/fabrica-interna-3.webp" alt="Bancadas de montagem" width={307} height={206} sizes="18vw" />
            </figure>
          </div>
        </div>
      </section>

      <section className="section section--navy blueprint on-dark">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">Como trabalhamos</span>
            <h2 className="section-title">Tecnologia, qualidade e inovação.</h2>
          </div>
          <div className="pillars">
            <div className="pillar" data-reveal>
              <Factory aria-hidden />
              <h3>Infraestrutura</h3>
              <p>Investimos continuamente em tecnologia e contamos com maquinário moderno e sofisticado.</p>
            </div>
            <div className="pillar" data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
              <FlaskConical aria-hidden />
              <h3>Qualidade garantida</h3>
              <p>Laboratório próprio de testes e controle de qualidade, que assegura a qualidade e o desempenho de todos os nossos produtos.</p>
            </div>
            <div className="pillar" data-reveal style={{ "--reveal-delay": "160ms" } as React.CSSProperties}>
              <Sparkles aria-hidden />
              <h3>Inovação</h3>
              <p>{ABOUT.innovation}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="band band--navy on-dark" data-reveal>
            <div className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
              <span className="eyebrow">Missão</span>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-2xl)", fontWeight: 700, color: "#fff", lineHeight: 1.2, maxWidth: "30ch" }}>
                {ABOUT.mission}
              </p>
            </div>
            <div className="row wrap">
              <Link href="/produtos" className="btn btn--signal btn--lg">
                Ver produtos <ArrowRight className="btn__arrow" aria-hidden />
              </Link>
              <Link href="/trabalhe-conosco" className="btn btn--on-dark btn--lg">
                Trabalhe conosco
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
