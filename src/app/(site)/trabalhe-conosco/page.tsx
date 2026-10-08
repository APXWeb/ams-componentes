import type { Metadata } from "next";
import Image from "next/image";
import { Briefcase, FlaskConical, History, Sparkles, Target } from "lucide-react";
import { getDepartmentsPublic, getOpenVacancies } from "@/lib/demo/public";
import { ABOUT, SITE } from "@/lib/site";
import { Suspense } from "react";
import { JobFilters, JobFiltersFromUrl, JobList, JobListFromUrl } from "@/components/site/job-list";

export const metadata: Metadata = {
  title: "Trabalhe conosco",
  description: `Vagas abertas na AMS Componentes, fabricante nacional de fusíveis automotivos desde ${SITE.founded} em Cotia (SP). Envie sua candidatura.`,
  alternates: { canonical: "/trabalhe-conosco" },
};

export default function TrabalheConoscoPage() {
  const all = getOpenVacancies();
  const departments = getDepartmentsPublic();
  const years = new Date().getFullYear() - SITE.founded;

  return (
    <>
      <section className="hero blueprint on-dark">
        <div className="container hero__inner">
          <div className="hero__anim">
            <span className="eyebrow">Trabalhe conosco</span>
            <h1 style={{ fontSize: "var(--fs-3xl)" }}>
              Construa sua carreira em uma indústria com <em>{years} anos</em> de história.
            </h1>
            <p className="hero__lede">
              A AMS fabrica fusíveis, cordoalhas, terminais e cabos de bateria em {SITE.city} ({SITE.state}) desde {SITE.founded}. Conheça as áreas, veja as vagas abertas e candidate-se direto ao nosso RH.
            </p>
            <div className="hero__ctas">
              <a href="#vagas" className="btn btn--signal btn--lg">
                <Briefcase aria-hidden /> Ver {all.length} {all.length === 1 ? "vaga aberta" : "vagas abertas"}
              </a>
            </div>
          </div>
          <div className="photo-stack photo-stack--single">
            <figure>
              <Image src="/img/eventos/automec-2025-3.webp" alt="Equipe da AMS no estande da feira Automec 2025" width={970} height={735} sizes="(max-width: 900px) 100vw, 42vw" priority style={{ aspectRatio: "4 / 3" }} />
              <figcaption>EQUIPE AMS · AUTOMEC 2025</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">Cultura AMS</span>
            <h2 className="section-title">O que move a nossa fábrica.</h2>
            <p className="lede">{ABOUT.mission}</p>
          </div>
          <div className="values">
            <div className="value" data-reveal>
              <History aria-hidden />
              <h3>Tradição</h3>
              <p>Fundada em {SITE.founded} por {SITE.founder}, a AMS nasceu da paixão pela indústria automotiva.</p>
            </div>
            <div className="value" data-reveal style={{ "--reveal-delay": "60ms" } as React.CSSProperties}>
              <FlaskConical aria-hidden />
              <h3>Qualidade</h3>
              <p>Laboratório próprio de testes e controle de qualidade em todos os produtos.</p>
            </div>
            <div className="value" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
              <Sparkles aria-hidden />
              <h3>Inovação</h3>
              <p>Atualização constante e lançamento de novos produtos para os nossos clientes.</p>
            </div>
            <div className="value" data-reveal style={{ "--reveal-delay": "180ms" } as React.CSSProperties}>
              <Target aria-hidden />
              <h3>Foco no cliente</h3>
              <p>Parceria com os mais renomados distribuidores de autopeças e indústrias do Brasil.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--sunken" id="vagas" aria-labelledby="vagas-title">
        <div className="container">
          <div className="section-head section-head--split">
            <div className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
              <span className="eyebrow">Vagas abertas</span>
              <h2 className="section-title" id="vagas-title">
                Oportunidades na AMS
              </h2>
              <span className="demo-flag">Projeto conceitual: vagas fictícias</span>
            </div>
            <Suspense fallback={<JobFilters initial={all} area="" />}>
              <JobFiltersFromUrl initial={all} />
            </Suspense>
          </div>

          <Suspense fallback={<JobList initial={all} area="" />}>
            <JobListFromUrl initial={all} />
          </Suspense>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">Processo seletivo</span>
            <h2 className="section-title">Como funciona.</h2>
            <p className="lede">Toda candidatura chega direto ao RH da AMS, que acompanha cada etapa e entra em contato com você.</p>
          </div>
          <ol className="process" style={{ padding: 0, margin: 0 }} data-reveal>
            <li>
              <h3>Candidatura</h3>
              <p>Você escolhe a vaga e envia seus dados e currículo pelo site.</p>
            </li>
            <li>
              <h3>Triagem</h3>
              <p>O RH analisa o currículo de acordo com os requisitos da vaga.</p>
            </li>
            <li>
              <h3>Entrevista</h3>
              <p>Conversa com o RH e com o gestor da área.</p>
            </li>
            <li>
              <h3>Avaliação</h3>
              <p>Quando a vaga pede, uma etapa prática ou técnica.</p>
            </li>
            <li>
              <h3>Retorno</h3>
              <p>Contato com o resultado e, em caso de aprovação, os próximos passos da admissão.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section section--sunken">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">Áreas da empresa</span>
            <h2 className="section-title">Onde você pode atuar.</h2>
            <span className="demo-flag">Áreas ilustrativas do projeto conceitual</span>
          </div>
          <div className="lines" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {departments.map((d, i) => (
              <div key={d.name} className="line-card" style={{ minHeight: 0 }} data-reveal>
                <span className="line-card__idx">{String(i + 1).padStart(2, "0")}</span>
                <span className="line-card__meta" style={{ paddingTop: 26 }}>
                  <h3 style={{ fontSize: "1.1rem" }}>{d.name}</h3>
                  <p>{d.description}</p>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
