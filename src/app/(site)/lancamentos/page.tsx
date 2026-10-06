import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/site/product-card";
import { launches } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Lançamentos",
  description: "Últimos lançamentos da AMS Componentes: fusíveis, terminais de bateria, garras, manoplas, abraçadeiras e acessórios.",
  alternates: { canonical: "/lancamentos" },
};

export default function LancamentosPage() {
  const items = launches();
  return (
    <>
      <section className="page-head page-head--light">
        <div className="container">
          <ol className="crumbs">
            <li>
              <Link href="/">Início</Link>
            </li>
            <li aria-current="page">Lançamentos</li>
          </ol>
          <h1>Últimos lançamentos</h1>
          <p className="lede">{items.length} novidades da linha AMS. Confira as especificações de cada produto ou consulte o catálogo completo.</p>
        </div>
      </section>
      <section className="section--tight">
        <div className="container">
          <div className="product-grid">
            {items.map((p, i) => (
              <div key={p.slug} data-reveal style={{ "--reveal-delay": `${(i % 4) * 60}ms` } as React.CSSProperties}>
                <ProductCard p={p} priority={i < 4} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
