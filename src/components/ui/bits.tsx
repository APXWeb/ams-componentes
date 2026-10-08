import type { LucideIcon } from "lucide-react";
import { STATUS_TONE, type Tone } from "@/lib/labels";
import { initials } from "@/lib/format";
import { asset } from "@/lib/asset";

export function Badge({ children, tone, status, plain }: { children: React.ReactNode; tone?: Tone; status?: string; plain?: boolean }) {
  const t = tone ?? (status ? STATUS_TONE[status] : undefined) ?? "neutral";
  return <span className={`badge ${t !== "neutral" ? `badge--${t}` : ""} ${plain ? "badge--plain" : ""}`}>{children}</span>;
}

export function Empty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon aria-hidden />
      </span>
      <strong>{title}</strong>
      {children ? <p style={{ maxWidth: 360 }}>{children}</p> : null}
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </div>
  );
}

// tons da marca para as iniciais: cada pessoa mantém sempre a mesma cor
const AVATAR_TONES = ["t1", "t2", "t3", "t4", "t5", "t6"];
const toneOf = (name: string) => AVATAR_TONES[[...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_TONES.length];

export function Avatar({ name, photo, size }: { name: string; photo?: string | null; size?: "sm" | "lg" | "xl" }) {
  return (
    <span className={`avatar ${size ? `avatar--${size}` : ""} ${photo ? "" : `avatar--${toneOf(name)}`}`} aria-hidden>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** Esqueleto de carregamento de uma página do RH (KPIs + painel). */
export function PageSkeleton({ kpis = 4 }: { kpis?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="skeleton" style={{ width: 120, height: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 280, height: 30, marginBottom: 26 }} />
      {kpis ? (
        <div className="kpis">
          {Array.from({ length: kpis }, (_, i) => (
            <div key={i} className="kpi">
              <div className="skeleton" style={{ width: "60%", height: 12 }} />
              <div className="skeleton" style={{ width: "30%", height: 28, marginTop: 6 }} />
            </div>
          ))}
        </div>
      ) : null}
      <div className="panel" style={{ height: 320 }}>
        <div className="skeleton" style={{ margin: 18, height: 16, width: "40%" }} />
        <div className="skeleton" style={{ margin: 18, height: 220 }} />
      </div>
    </div>
  );
}

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClass = "panel__body",
  footer,
  id,
}: {
  title?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
  footer?: React.ReactNode;
  id?: string;
}) {
  return (
    <section className={`panel ${className ?? ""}`} id={id} aria-labelledby={id && title ? `${id}-t` : undefined}>
      {title ? (
        <header className="panel__head">
          <h2 className="panel__title" id={id ? `${id}-t` : undefined}>
            {Icon ? <Icon aria-hidden /> : null}
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      <div className={bodyClass}>{children}</div>
      {footer ? <footer className="panel__foot">{footer}</footer> : null}
    </section>
  );
}

/** Marca da AMS: triângulo + logotipo oficial. */
export function AmsMark({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset("/img/logo-ams.png")} alt="" width={size} height={Math.round(size * 0.886)} style={{ width: size, height: "auto" }} />
  );
}
