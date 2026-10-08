import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/*
 * PREVIEW_MODE=1: publicação do projeto conceitual. Bloqueia indexação do site inteiro para
 * que a demonstração (com dados fictícios) nunca concorra com o site oficial da AMS nos buscadores.
 * Lido no build: definir antes de `next build`.
 */
const preview = process.env.PREVIEW_MODE === "1";

/*
 * STATIC_EXPORT=1 gera o site como arquivos estáticos em out/ (GitHub Pages). BASE_PATH é o
 * subcaminho da publicação, ex.: "/ams-componentes" em apxweb.github.io/ams-componentes.
 * Como a demonstração não tem backend, o site inteiro funciona como estático.
 */
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(staticExport ? { output: "export" as const, trailingSlash: true } : {}),
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // as imagens já são WEBP otimizadas; o carregador só aplica o subcaminho da publicação
  images: { loader: "custom", loaderFile: "./src/lib/image-loader.ts" },
  ...(staticExport ? {} : serverOnly()),
};

/** Cabeçalhos e redirecionamentos só existem quando há servidor Node (não no GitHub Pages). */
function serverOnly(): Pick<NextConfig, "headers" | "redirects"> {
  return {
  async headers() {
    return [
      { source: "/:path*", headers: preview ? [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }] : securityHeaders },
      // a área do RH nunca deve ser indexada
      { source: "/rh/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  async redirects() {
    // URLs do site WordPress atual, para preservar links externos e indexação
    return [
      { source: "/quem-somos", destination: "/empresa", permanent: true },
      { source: "/contatos", destination: "/contato", permanent: true },
      { source: "/representantes/", destination: "/representantes", permanent: true },
      { source: "/produto/fusivel-lamina1", destination: "/produtos/fusivel-lamina", permanent: true },
      { source: "/produto/:slug", destination: "/produtos/:slug", permanent: true },
      { source: "/terminal-de-fio", destination: "/produtos/terminal-de-fio", permanent: true },
      { source: "/agenda-2", destination: "/eventos", permanent: true },
      { source: "/pt/destaque", destination: "/lancamentos", permanent: true },
      { source: "/pt/eventos", destination: "/eventos", permanent: true },
      { source: "/pt", destination: "/", permanent: true },
      { source: "/loja", destination: "/produtos", permanent: true },
      { source: "/politica-de-privacidade", destination: "/privacidade", permanent: true },
    ];
  },
  };
}

export default nextConfig;
