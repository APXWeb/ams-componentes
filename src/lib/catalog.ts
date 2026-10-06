import data from "@/data/catalog.json";

/*
 * Catálogo de produtos transcrito do site oficial (ver _tools/build_catalog.py).
 * É conteúdo estático: as páginas de produto são geradas no build.
 */
export type Product = {
  slug: string;
  name: string;
  category: string;
  group: string;
  application: string[];
  columns: string[];
  rows: string[][];
  images: string[];
  launch: boolean;
  source: string;
};
export type Category = { slug: string; name: string; groups: { name: string; items: string[] }[] };

export const categories = data.categories as Category[];
export const products = data.products as Product[];

/** Resumo curto de cada linha para a vitrine (redigido a partir dos nomes do catálogo oficial). */
export const CATEGORY_INFO: Record<string, { short: string; cover: string }> = {
  fusiveis: { short: "Lâmina, mini, maxi, micro, mega, midi, potência, vidro e linhas especiais.", cover: "/produtos/fusivel-maxi-lamina-1.webp" },
  "porta-fusiveis": { short: "Porta-fusíveis para lâmina, maxi e mini, de potência e bases.", cover: "/produtos/porta-fusivel-lamina-maxi-e-mini-1.webp" },
  cordoalhas: { short: "Linha leve, linha pesada, barra de ligação e cordoalhas em metro.", cover: "/produtos/cordoalhas-veiculos-pesados-duas-ponteiras-1.webp" },
  "cabos-para-bateria": { short: "Cabos positivo e negativo, originais e universais, e cabos em metro.", cover: "/produtos/cabos-de-bateria-veiculos-leve-universal-positivo-1.webp" },
  "terminais-e-ponteiras": { short: "Terminais de bateria, terminais de fio e ponteiras para cabos.", cover: "/produtos/terminais-de-bateria-3-vias-1.webp" },
  "cabos-de-transferencia": { short: "Cabos de transferência de carga de veículos leves a extrapesados.", cover: "/produtos/cabo-de-transferencia-veiculos-pesados-ate-800-amperes-1.webp" },
  "garras-e-manoplas": { short: "Garras jacaré, alicatão, com parafuso, com mola e manoplas.", cover: "/produtos/garras-reforcada-alicatao-1.webp" },
  abracadeiras: { short: "Abraçadeiras de nylon nas cores branca e preta.", cover: "/produtos/abracadeiras-de-nylon-preto-1.webp" },
  acessorios: { short: "Sacador de fusível.", cover: "/produtos/sacador-de-fusivel-1.webp" },
};

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);
export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
export const launches = () => products.filter((p) => p.launch);

/** Total de códigos (linhas das tabelas técnicas) publicados no catálogo. */
export const totalCodes = products.reduce((n, p) => n + p.rows.length, 0);

/** Coluna com o código do item, quando existir. */
export function codeColumn(p: Product) {
  return p.columns.findIndex((c) => c.toLowerCase() === "código");
}

export function searchProducts(q: string) {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const n = norm(q.trim());
  if (!n) return products;
  return products.filter(
    (p) => norm(p.name).includes(n) || norm(p.group).includes(n) || p.rows.some((r) => r.some((c) => norm(c).includes(n))) || p.application.some((a) => norm(a).includes(n)),
  );
}
