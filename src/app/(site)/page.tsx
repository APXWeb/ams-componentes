import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Download, FlaskConical, Factory, Sparkles, MapPinned, Globe2, Briefcase, BookOpen, ShieldCheck } from "lucide-react";
import { HeroShowcase, type ShowcaseItem } from "@/components/site/hero-showcase";
import { ProductCard } from "@/components/site/product-card";
import { Counter } from "@/components/ui/motion";
import { RepPicker } from "@/components/site/rep-picker";
import { categories, CATEGORY_INFO, codeColumn, launches, productBySlug, products, totalCodes } from "@/lib/catalog";
import { ABOUT, SITE, STATES } from "@/lib/site";
import { getOpenVacancies } from "@/lib/demo/public";

function slide(slug: string): ShowcaseItem {
  const p = productBySlug(slug)!;
  const ci = codeColumn(p);
  const codes = ci >= 0 ? p.rows.map((r) => r[ci]).filter(Boolean) : [];
  return {
    name: p.name,
    group: categories.find((c) => c.slug === p.category)!.name,
    image: p.images[0],
    codes: codes.length > 1 ? `ref. ${codes[0]} a ${codes[codes.length - 1]}` : codes[0] ? `ref. ${codes[0]}` : "",
    count: p.rows.length,
    href: `/produtos/${p.slug}`,
  };
}

export default function Home() {
  const slides = ["fusivel-maxi-lamina", "fusivel-mega-macho", "cordoalhas-veiculos-pesados-duas-ponteiras", "terminais-de-bateria-3-vias"].map(slide);
  const statesWithRep = STATES.filter((s) => s.reps.length).length;
  const openJobs = getOpenVacancies().length;
  const years = new Date().getFullYear() - SITE.founded;
  const featured = launches();
  const lp = productBySlug("fusivel-maxi-lamina-plus") ?? featured[0];
  const launchCard = lp ? { name: lp.name, image: lp.images[0], href: `/produtos/${lp.slug}` } : undefined;

  return (
    <>
      {/* HERO */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__inner">
          <div className="hero__copy-wrap">
            <span className="hero__dots" aria-hidden />
            <div className="hero__copy hero__anim">
              <span className="eyebrow">Fabricante nacional · Desde {SITE.founded}</span>
              <h1 id="hero-title">
                A maior fabricante nacional de <em>fusíveis automotivos</em>
              </h1>
              <p className="hero__lede">
                Fornecedora dos mais conceituados distribuidores de autopeças e da indústria do país, com linha completa de fusíveis, cordoalhas, terminais e cabos de bateria.
              </p>
              <div className="hero__ctas">
                <Link href="/produtos" className="btn btn--lg">
                  Ver produtos <ArrowRight className="btn__arrow" aria-hidden />
                </Link>
                <a href={SITE.catalogPdf} className="btn btn--outline btn--lg" target="_blank" rel="noopener">
                  <Download aria-hidden /> Catálogo 2025 (PDF)
                </a>
              </div>
              <ul className="hero__trust">
                <li>
                  <ShieldCheck aria-hidden /> Laboratório próprio de qualidade
                </li>
                <li>
                  <Factory aria-hidden /> Fabricação nacional em {SITE.city}, {SITE.state}
                </li>
              </ul>
            </div>
          </div>
          <HeroShowcase items={slides} launch={launchCard} />
        </div>
      </section>

      {/* NÚMEROS */}
      <section className="stats on-dark" aria-label="A AMS em números">
        <div className="container stats__grid">
          <div className="stat">
            <span className="stat__value">{SITE.founded}</span>
            <span className="stat__label">Ano de fundação, há {years} anos</span>
          </div>
          <div className="stat">
            <Counter className="stat__value" value={products.length} />
            <span className="stat__label">Linhas de produto em {categories.length} famílias</span>
          </div>
          <div className="stat">
            <Counter className="stat__value" value={totalCodes} />
            <span className="stat__label">Códigos com especificação técnica</span>
          </div>
          <div className="stat">
            <Counter className="stat__value" value={statesWithRep} />
            <span className="stat__label">Estados com representante comercial</span>
          </div>
        </div>
      </section>

      {/* LINHAS */}
      <section className="section" aria-labelledby="linhas-title">
        <div className="container">
          <div className="section-head section-head--split" data-reveal>
            <div className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
              <span className="eyebrow">Linhas de produto</span>
              <h2 className="section-title" id="linhas-title">
                Do fusível de lâmina ao cabo de transferência de carga.
              </h2>
            </div>
            <Link href="/produtos" className="btn btn--outline">
              Catálogo completo <ArrowRight className="btn__arrow" aria-hidden />
            </Link>
          </div>
          <div className="lines">
            {categories.map((c, n) => {
              const count = products.filter((p) => p.category === c.slug).length;
              return (
                <Link
                  key={c.slug}
                  href={`/produtos?linha=${c.slug}`}
                  className={`line-card ${n === 0 ? "line-card--feature" : ""}`}
                  data-reveal
                  style={{ "--reveal-delay": `${(n % 4) * 60}ms` } as React.CSSProperties}
                >
                  <span className="line-card__idx">{String(n + 1).padStart(2, "0")}</span>
                  <span className="line-card__count badge badge--plain">{count} itens</span>
                  <span className="line-card__img">
                    <Image src={CATEGORY_INFO[c.slug].cover} alt="" width={420} height={420} sizes={n === 0 ? "(max-width: 720px) 90vw, 45vw" : "(max-width: 720px) 45vw, 22vw"} />
                  </span>
                  <span className="line-card__meta">
                    <h3>
                      {c.name} <ArrowUpRight aria-hidden />
                    </h3>
                    <p>{CATEGORY_INFO[c.slug].short}</p>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* EMPRESA */}
      <section className="section section--sunken" aria-labelledby="empresa-title">
        <div className="container about-split">
          <div data-reveal>
            <span className="eyebrow">A empresa</span>
            <h2 className="section-title" id="empresa-title" style={{ marginTop: 14 }}>
              Quase cinco décadas fabricando no Brasil.
            </h2>
            <p className="lede" style={{ marginTop: 18 }}>
              {ABOUT.history} {ABOUT.location}
            </p>
            <dl className="facts">
              <div className="fact">
                <dt>Fundação</dt>
                <dd>{SITE.founded}, por {SITE.founder}</dd>
              </div>
              <div className="fact">
                <dt>Matriz</dt>
                <dd>
                  {SITE.city}, {SITE.region}
                </dd>
              </div>
              <div className="fact">
                <dt>Qualidade</dt>
                <dd>Laboratório próprio de testes e controle de qualidade</dd>
              </div>
              <div className="fact">
                <dt>Atendimento</dt>
                <dd>Distribuidores de autopeças, indústria e exportação</dd>
              </div>
            </dl>
            <Link href="/empresa" className="btn btn--outline" style={{ marginTop: 28 }}>
              Conheça a AMS <ArrowRight className="btn__arrow" aria-hidden />
            </Link>
          </div>
          <div className="photo-stack" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
            <figure>
              <Image src="/img/fabrica-aerea.webp" alt="Vista aérea da fábrica da AMS Componentes em Cotia" width={940} height={381} sizes="(max-width: 900px) 100vw, 50vw" />
              <figcaption>MATRIZ · COTIA, SP</figcaption>
            </figure>
            <figure>
              <Image src="/img/fabrica-interna-1.webp" alt="Linha de máquinas no interior da fábrica" width={305} height={206} sizes="18vw" />
            </figure>
            <figure>
              <Image src="/img/fabrica-interna-2.webp" alt="Prensas e postos de trabalho na produção" width={310} height={206} sizes="18vw" />
            </figure>
            <figure>
              <Image src="/img/fabrica-interna-3.webp" alt="Bancadas de montagem na fábrica" width={307} height={206} sizes="18vw" />
            </figure>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="section section--navy blueprint on-dark" aria-labelledby="dif-title">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">Por que AMS</span>
            <h2 className="section-title" id="dif-title">
              Estrutura de fabricante, atendimento em todo o país.
            </h2>
          </div>
          <div className="pillars">
            {[
              { icon: Factory, t: "Fabricação própria", d: "Maquinário moderno e produção na matriz em Cotia, na Grande São Paulo." },
              { icon: FlaskConical, t: "Laboratório de qualidade", d: "Laboratório próprio de testes e controle de qualidade para garantir o desempenho de cada produto." },
              { icon: Sparkles, t: "Lançamentos constantes", d: "Atualização contínua da linha, acompanhando as tendências do mercado automotivo." },
              { icon: MapPinned, t: "Representantes em todo o país", d: `Rede comercial com representantes em ${statesWithRep} estados e atendimento direto pela fábrica.` },
              { icon: Globe2, t: "Indústria e exportação", d: "Canais dedicados para clientes da indústria e para o mercado externo." },
              { icon: BookOpen, t: "Catálogo técnico completo", d: `${totalCodes} códigos com amperagem, cores, medidas e aplicação, em PDF e catálogo eletrônico.` },
            ].map((x, n) => (
              <div key={x.t} className="pillar" data-reveal style={{ "--reveal-delay": `${(n % 3) * 80}ms` } as React.CSSProperties}>
                <x.icon aria-hidden />
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LANÇAMENTOS */}
      <section className="section" aria-labelledby="lanc-title">
        <div className="container">
          <div className="section-head section-head--split" data-reveal>
            <div className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
              <span className="eyebrow">Últimos lançamentos</span>
              <h2 className="section-title" id="lanc-title">
                Novidades da linha AMS.
              </h2>
            </div>
            <Link href="/lancamentos" className="btn btn--outline">
              Todos os lançamentos <ArrowRight className="btn__arrow" aria-hidden />
            </Link>
          </div>
          <div className="rail" data-reveal>
            {featured.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* REPRESENTANTES */}
      <section className="section--tight" aria-labelledby="rep-title">
        <div className="container">
          <div className="band band--yellow" data-reveal>
            <div className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <h2 id="rep-title" style={{ fontSize: "var(--fs-2xl)" }}>
                Encontre o representante AMS do seu estado.
              </h2>
              <p>Clientes da indústria e de exportação falam direto com a fábrica.</p>
            </div>
            <RepPicker states={STATES.map((s) => ({ uf: s.uf, name: s.name, has: s.reps.length > 0 }))} />
          </div>
        </div>
      </section>

      {/* TRABALHE CONOSCO */}
      <section className="section" aria-labelledby="carreira-title">
        <div className="container">
          <div className="careers" data-reveal>
            <div className="careers__photo">
              <Image src="/img/eventos/automec-2025-3.webp" alt="Equipe da AMS no estande da Automec 2025" fill sizes="(max-width: 860px) 100vw, 55vw" />
            </div>
            <div className="careers__body on-dark">
              <span className="eyebrow">Trabalhe conosco</span>
              <h2 id="carreira-title">Faça parte de uma indústria brasileira com {years} anos de história.</h2>
              <p>Conheça as áreas da AMS, veja as vagas abertas e envie sua candidatura direto para o nosso RH.</p>
              <div className="careers__open">
                <strong>{String(openJobs).padStart(2, "0")}</strong>
                <span>{openJobs === 1 ? "vaga aberta no momento" : "vagas abertas no momento"}</span>
              </div>
              <div>
                <Link href="/trabalhe-conosco" className="btn btn--signal btn--lg">
                  <Briefcase aria-hidden /> Ver vagas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATÁLOGO */}
      <section className="section--tight" style={{ paddingTop: 0 }} aria-labelledby="cat-title">
        <div className="container">
          <div className="catalog-band ticks" data-reveal>
            <span className="catalog-band__icon">
              <Download aria-hidden />
            </span>
            <div>
              <h2 id="cat-title" style={{ fontSize: "var(--fs-lg)" }}>
                Catálogo AMS 2025
              </h2>
              <p className="muted small">Linha completa com códigos e especificações, em PDF ou no catálogo eletrônico para desktop.</p>
            </div>
            <div className="row wrap">
              <a href={SITE.catalogPdf} className="btn" target="_blank" rel="noopener">
                Baixar PDF
              </a>
              <a href={SITE.catalogOnline} className="btn btn--outline" target="_blank" rel="noopener">
                Catálogo eletrônico <ArrowUpRight aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
