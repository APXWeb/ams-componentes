import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, CheckCircle2, Download, MapPinned, MessageSquare } from "lucide-react";
import { ProductGallery } from "@/components/site/product-gallery";
import { SpecTable } from "@/components/site/spec-table";
import { ProductCard } from "@/components/site/product-card";
import { categoryBySlug, codeColumn, productBySlug, products } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produtos/[slug]">): Promise<Metadata> {
  const p = productBySlug((await params).slug);
  if (!p) return {};
  const app = p.application.join(" ").slice(0, 110);
  return {
    title: p.name,
    description: `${p.name} AMS: ${p.rows.length} códigos com especificação técnica.${app ? ` Aplicação: ${app}` : ""}`,
    alternates: { canonical: `/produtos/${p.slug}` },
    openGraph: { images: p.images[0] ? [p.images[0]] : undefined },
  };
}

export default async function ProdutoPage({ params }: PageProps<"/produtos/[slug]">) {
  const { slug } = await params;
  const p = productBySlug(slug);
  if (!p) notFound();
  const cat = categoryBySlug(p.category)!;
  const ci = codeColumn(p);
  const codes = ci >= 0 ? p.rows.map((r) => r[ci]).filter(Boolean) : [];
  const ampIdx = p.columns.findIndex((c) => /^amp/i.test(c));
  const amps = ampIdx >= 0 ? p.rows.map((r) => parseFloat(r[ampIdx].replace(",", "."))).filter((n) => !Number.isNaN(n)) : [];
  const colorIdx = p.columns.findIndex((c) => c.toLowerCase() === "cor");
  const colors = colorIdx >= 0 ? new Set(p.rows.map((r) => r[colorIdx].replace(/;$/, "")).filter(Boolean)).size : 0;
  const fmtA = (n: number) => String(n).replace(".", ",");
  const related = products.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    brand: { "@type": "Brand", name: "AMS" },
    manufacturer: { "@type": "Organization", name: SITE.name },
    category: cat.name,
    image: p.images.map((i) => `${SITE.url}${i}`),
    url: `${SITE.url}/produtos/${p.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="section--tight">
        <div className="container">
          <ol className="crumbs" style={{ color: "var(--text-3)", marginBottom: 28 }}>
            <li>
              <Link href="/">Início</Link>
            </li>
            <li>
              <Link href="/produtos">Produtos</Link>
            </li>
            <li>
              <Link href={`/produtos?linha=${cat.slug}`}>{cat.name}</Link>
            </li>
            <li aria-current="page">{p.name}</li>
          </ol>
          <div className="pd">
            <ProductGallery images={p.images} name={p.name} />
            <div>
              <span className="eyebrow">
                {cat.name}
                {p.group !== cat.name ? ` · ${p.group}` : ""}
              </span>
              <h1 className="pd__title">{p.name}</h1>
              <div className="pd__meta">
                {p.launch ? <span className="badge badge--brand">Lançamento</span> : null}
                {p.rows.length ? (
                  <span className="badge badge--plain">
                    {p.rows.length} {p.rows.length === 1 ? "código" : "códigos"}
                  </span>
                ) : null}
                <span className="badge badge--plain">Fabricação AMS</span>
              </div>

              {codes.length || amps.length ? (
                <dl className="quick">
                  {codes.length ? (
                    <div>
                      <dt>Códigos</dt>
                      <dd className="mono">{codes.length > 1 ? `${codes[0]} a ${codes[codes.length - 1]}` : codes[0]}</dd>
                    </div>
                  ) : null}
                  {amps.length ? (
                    <div>
                      <dt>Amperagem</dt>
                      <dd>{amps.length > 1 ? `${fmtA(Math.min(...amps))} a ${fmtA(Math.max(...amps))} A` : `${fmtA(amps[0])} A`}</dd>
                    </div>
                  ) : null}
                  {colors ? (
                    <div>
                      <dt>Cores</dt>
                      <dd>{colors}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {p.application.length ? (
                <div className="pd__app">
                  <h2 className="eyebrow" style={{ margin: "18px 0 6px", display: "flex" }}>
                    Aplicação
                  </h2>
                  <ul>
                    {p.application.map((a) => (
                      <li key={a}>
                        <CheckCircle2 aria-hidden />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="pd__ctas">
                <Link href={`/contato?produto=${p.slug}`} className="btn btn--lg">
                  <MessageSquare aria-hidden /> Solicitar informações
                </Link>
                <Link href="/representantes" className="btn btn--outline btn--lg">
                  <MapPinned aria-hidden /> Representante
                </Link>
              </div>
              <p className="small muted" style={{ marginTop: 16 }}>
                <a className="link" href={SITE.catalogPdf} target="_blank" rel="noopener">
                  <Download size={14} aria-hidden style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                  Catálogo completo em PDF
                </a>
              </p>
            </div>
          </div>

          {p.rows.length ? (
            <div style={{ marginTop: 56 }}>
              <Suspense fallback={<SpecTable columns={p.columns} rows={p.rows} />}>
                <SpecTable columns={p.columns} rows={p.rows} fromUrl />
              </Suspense>
            </div>
          ) : null}
        </div>
      </section>

      {related.length ? (
        <section className="section--tight section--sunken">
          <div className="container">
            <div className="section-head section-head--split" style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: "var(--fs-xl)" }}>Outros produtos da linha {cat.name}</h2>
              <Link href={`/produtos?linha=${cat.slug}`} className="btn btn--outline btn--sm">
                Ver linha completa <ArrowRight className="btn__arrow" aria-hidden />
              </Link>
            </div>
            <div className="product-grid">
              {related.map((r) => (
                <ProductCard key={r.slug} p={r} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
