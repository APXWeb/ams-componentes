import type { MetadataRoute } from "next";
import { products } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/empresa", "/produtos", "/lancamentos", "/representantes", "/eventos", "/contato", "/trabalhe-conosco", "/privacidade"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: `${SITE.url}/produtos/${p.slug}`, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
