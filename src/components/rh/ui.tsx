import Link from "next/link";
import { ArrowLeft, Star, type LucideIcon } from "lucide-react";
import { MONTHS_SHORT, parseDay } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        {back ? (
          <Link href={back.href} className="backlink">
            <ArrowLeft aria-hidden /> {back.label}
          </Link>
        ) : eyebrow ? (
          <span className="eyebrow">{eyebrow}</span>
        ) : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}

export function Kpi({
  label,
  value,
  meta,
  icon: Icon,
  href,
  alert,
}: {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  alert?: boolean;
}) {
  const inner = (
    <>
      <span className="kpi__label">
        <Icon aria-hidden /> {label}
      </span>
      <span className="kpi__value">{value}</span>
      {meta ? <span className="kpi__meta">{meta}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className={`kpi ${alert ? "kpi--alert" : ""}`}>
      {inner}
    </Link>
  ) : (
    <div className={`kpi ${alert ? "kpi--alert" : ""}`}>{inner}</div>
  );
}

export function Stars({ value }: { value: number | null }) {
  if (!value) return <span className="xsmall subtle">Sem avaliação</span>;
  return (
    <span className="stars" aria-label={`Avaliação ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= value ? "on" : ""} aria-hidden />
      ))}
    </span>
  );
}

export function DateChip({ date, today }: { date: string; today?: boolean }) {
  const d = parseDay(date.length > 10 ? new Date(date).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : date);
  return (
    <span className={`date-chip ${today ? "date-chip--today" : ""}`} aria-hidden>
      <span>{MONTHS_SHORT[d.getMonth()]}</span>
      <b>{d.getDate()}</b>
    </span>
  );
}

/* ------------------------------------------------------------- gráficos */

/** Barras horizontais com rótulo e valor; ideal para comparar categorias. */
export function HBars({ data, color, unit }: { data: { label: string; value: number; href?: string }[]; color?: string; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="hbars" role="list">
      {data.map((d, i) => {
        const row = (
          <>
            <span className="hbar__label" title={d.label}>
              {d.label}
            </span>
            <span className="hbar__track" aria-hidden>
              <span className="hbar__fill" style={{ display: "block", width: `${(d.value / max) * 100}%`, background: color, animationDelay: `${i * 50}ms` }} />
            </span>
            <span className="hbar__val">
              {d.value}
              {unit ?? ""}
            </span>
          </>
        );
        return d.href ? (
          <Link key={d.label} href={d.href} className="hbar" role="listitem" aria-label={`${d.label}: ${d.value}`}>
            {row}
          </Link>
        ) : (
          <div key={d.label} className="hbar" role="listitem" aria-label={`${d.label}: ${d.value}`}>
            {row}
          </div>
        );
      })}
    </div>
  );
}

/** Funil do pipeline de recrutamento. */
export function Funnel({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="funnel" role="list">
      {data.map((d, i) => (
        <div key={d.label} className="funnel__row" role="listitem" aria-label={`${d.label}: ${d.value}`}>
          <span className="small muted">{d.label}</span>
          <span className="funnel__bar" style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, animationDelay: `${i * 70}ms` }} aria-hidden />
          <span className="mono small" style={{ textAlign: "right" }}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Colunas agrupadas (ex.: admissões x desligamentos por mês), em SVG acessível. */
export function Columns({
  data,
  series,
  height = 180,
}: {
  data: { label: string; values: number[] }[];
  series: { name: string; color: string }[];
  height?: number;
}) {
  const W = 640;
  const H = height;
  const pad = { l: 26, r: 6, t: 10, b: 24 };
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const ticks = max <= 4 ? max : 4;
  const step = Math.ceil(max / ticks);
  const top = step * ticks;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const bw = innerW / data.length;
  const gap = Math.min(10, bw * 0.25);
  const barW = (bw - gap) / series.length;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Gráfico de colunas: ${series.map((s) => s.name).join(" e ")}`}>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = pad.t + innerH - (i * step * innerH) / top;
          return (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="grid-line" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end">
                {i * step}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => (
          <g key={d.label}>
            {d.values.map((v, s) => {
              const h = (v / top) * innerH;
              return (
                <rect
                  key={s}
                  className="bar"
                  x={pad.l + i * bw + gap / 2 + s * barW}
                  y={pad.t + innerH - h}
                  width={Math.max(2, barW - 2)}
                  height={h}
                  rx={1.5}
                  fill={series[s].color}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <title>{`${d.label}: ${series[s].name} ${v}`}</title>
                </rect>
              );
            })}
            <text x={pad.l + i * bw + bw / 2} y={H - 6} textAnchor="middle">
              {d.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="legend" style={{ marginTop: 10 }}>
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Mês</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              {d.values.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Rosca para proporções simples (poucas fatias). */
export function Donut({ data, size = 140, center }: { data: { label: string; value: number; color: string }[]; size?: number; center?: React.ReactNode }) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  const lens = data.map((d) => (d.value / total) * c);
  const offsets = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="row" style={{ "--gap": "20px", alignItems: "center", flexWrap: "wrap" } as React.CSSProperties}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--steel-100)" strokeWidth="16" />
          {data.map((d, i) => {
            const len = lens[i];
            return (
              <circle
                key={d.label}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="16"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offsets[i]}
                transform="rotate(-90 70 70)"
              />
            );
          })}
        </svg>
        {center ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{center}</div>
        ) : null}
      </div>
      <ul className="list" style={{ display: "grid", gap: 6, fontSize: "var(--fs-sm)" }}>
        {data.map((d) => (
          <li key={d.label} className="row" style={{ "--gap": "8px" } as React.CSSProperties}>
            <i style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: "inline-block" }} />
            <span className="muted">{d.label}</span>
            <strong className="mono" style={{ marginLeft: "auto", paddingLeft: 12 }}>
              {d.value}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
