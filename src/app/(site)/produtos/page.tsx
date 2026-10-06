import type { Metadata } from "next";
import Link from "next/link";
import { ProductBrowser, type BrowserItem } from "@/components/site/product-browser";
import { categories, products, totalCodes } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Produtos",
  description:
    "Catálogo AMS: fusíveis automotivos (lâmina, mini, maxi, micro, mega, midi, potência), porta-fusíveis, cordoalhas, cabos e terminais de bateria, cabos de transferência, garras e abraçadeiras.",
  alternates: { canonical: "/produtos" },
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default async function ProdutosPage({ searchParams }: PageProps<"/produtos">) {
  const sp = await searchParams;
  const linha = typeof sp.linha === "string" && categories.some((c) => c.slug === sp.linha) ? sp.linha : "";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const items: BrowserItem[] = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    group: p.group,
    category: p.category,
    image: p.images[0],
    launch: p.launch,
    count: p.rows.length,
    haystack: norm([p.group, ...p.application, ...p.rows.flat()].join(" ")),
  }));

  return (
    <>
      <section className="page-head page-head--light">
        <div className="container">
          <ol className="crumbs">
            <li>
              <Link href="/">Início</Link>
            </li>
            <li aria-current="page">Produtos</li>
          </ol>
          <h1>Catálogo de produtos</h1>
          <p className="lede">
            {products.length} linhas e {totalCodes} códigos com especificação técnica. Busque pelo nome do produto ou digite o código AMS.
          </p>
        </div>
      </section>
      <section className="section--tight">
        <div className="container">
          <ProductBrowser items={items} categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} initialCategory={linha} initialQuery={q} />
        </div>
      </section>
    </>
  );
}
