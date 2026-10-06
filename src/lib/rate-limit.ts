import "server-only";

/*
 * Limitador em memória (janela deslizante) para login e formulários públicos.
 * Com mais de uma instância em produção, trocar por Redis ou banco mantendo a mesma interface.
 */
const buckets = new Map<string, number[]>();

function recent(key: string, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  buckets.set(key, hits);
  return hits;
}

/** Já atingiu o limite? (não registra tentativa) */
export function isLimited(key: string, max: number, windowMs: number) {
  return recent(key, windowMs).length >= max;
}

/** Registra uma tentativa (ex.: login que falhou). */
export function hit(key: string) {
  const hits = buckets.get(key) ?? [];
  hits.push(Date.now());
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
}

/** Verifica e registra numa só chamada (formulários públicos: cada envio conta). */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  if (isLimited(key, max, windowMs)) return false;
  hit(key);
  return true;
}
