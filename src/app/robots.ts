import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // prévia de demonstração: nada deve ser indexado
  if (process.env.PREVIEW_MODE === "1") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/rh/", "/rh"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
