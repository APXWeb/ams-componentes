import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/*
 * PREVIEW_MODE=1: publicação de prévia/demonstração. Bloqueia indexação do site inteiro para
 * que a proposta (com dados fictícios) nunca concorra com o site oficial da AMS nos buscadores.
 * Lido no build: definir antes de `next build`.
 */
const preview = process.env.PREVIEW_MODE === "1";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // currículos e documentos chegam via Server Actions; o limite real por arquivo é validado em src/lib/storage.ts
    serverActions: { bodySizeLimit: "9mb" },
    authInterrupts: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: preview ? [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }] : securityHeaders },
      // a área privada nunca deve ser indexada nem guardada em cache compartilhado
      {
        source: "/rh/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      // arquivos privados podem ser pré-visualizados dentro do próprio sistema (currículo em PDF)
      { source: "/rh/arquivos/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
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

export default nextConfig;
