import type { MetadataRoute } from "next";
import { products } from "@/lib/catalog";
import { getOpenVacancies } from "@/lib/public-data";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/empresa", "/produtos", "/lancamentos", "/representantes", "/eventos", "/contato", "/trabalhe-conosco", "/privacidade"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: `${SITE.url}/produtos/${p.slug}`, changeFrequency: "yearly" as const, priority: 0.6 })),
    ...getOpenVacancies()
      .filter((v) => !v.isDemo)
      .map((v) => ({ url: `${SITE.url}/trabalhe-conosco/${v.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
