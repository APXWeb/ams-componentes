/* Formatação pt-BR compartilhada entre o site e o RH. */
const TZ = "America/Sao_Paulo";

/** "YYYY-MM-DD" é interpretado ao meio-dia local para não mudar de dia por causa do fuso. */
export function parseDay(d: string) {
  return new Date(d.length === 10 ? `${d}T12:00:00` : d);
}

export const fmtDate = (d?: string | null) =>
  d ? parseDay(d).toLocaleDateString("pt-BR", d.length === 10 ? {} : { timeZone: TZ }) : "—";

export const fmtDateLong = (d?: string | null) =>
  d ? parseDay(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

export const fmtDateShort = (d?: string | null) =>
  d ? parseDay(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "") : "—";

export const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("pt-BR", {
        timeZone: TZ,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const fmtTime = (d?: string | null) =>
  d ? new Date(d).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "—";

export function relative(d?: string | null) {
  if (!d) return "—";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.round(h / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return fmtDate(d);
}

export const fmtBytes = (n?: number | null) =>
  n == null
    ? "—"
    : n < 1024 * 1024
      ? `${Math.max(1, Math.round(n / 1024))} KB`
      : `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

export function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}

export function addDays(iso: string, n: number) {
  const d = parseDay(iso);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE");
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Momento atual deslocado em dias, em ISO (para filtros de período). */
export function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export function isFuture(iso?: string | null) {
  return !!iso && Date.parse(iso) > Date.now();
}
