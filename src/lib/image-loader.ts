/** Carregador do next/image: as imagens já saem otimizadas (WEBP); aqui só entra o subcaminho. */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}?w=${width}`;
}
