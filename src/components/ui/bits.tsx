import type { LucideIcon } from "lucide-react";
import { STATUS_TONE, type Tone } from "@/lib/labels";
import { initials } from "@/lib/format";

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

export function Avatar({ name, photoId, size }: { name: string; photoId?: number | null; size?: "sm" | "lg" }) {
  return (
    <span className={`avatar ${size ? `avatar--${size}` : ""}`} aria-hidden>
      {photoId ? (
        // foto privada servida pela rota autenticada de arquivos
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/rh/arquivos/${photoId}`} alt="" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
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
    <img src="/img/logo-ams.png" alt="" width={size} height={Math.round(size * 0.886)} style={{ width: size, height: "auto" }} />
  );
}
