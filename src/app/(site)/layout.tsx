import { ViewTransition } from "react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { RevealObserver } from "@/components/ui/motion";
import { categories, CATEGORY_INFO, products } from "@/lib/catalog";
import "./site.css";

const navCategories = categories.map((c) => ({
  slug: c.slug,
  name: c.name,
  cover: CATEGORY_INFO[c.slug].cover,
  count: products.filter((p) => p.category === c.slug).length,
}));

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader categories={navCategories} />
      <ViewTransition default="page">
        <main id="conteudo" tabIndex={-1}>
          {children}
        </main>
      </ViewTransition>
      <SiteFooter />
      <RevealObserver />
    </>
  );
}
