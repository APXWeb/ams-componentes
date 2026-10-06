import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayISO } from "@/lib/format";

export type CalEvent = { start: string; end: string; label: string; kind: "vacation" | "pending" | "interview"; href?: string };

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function monthFromParam(p?: string | string[]) {
  const v = typeof p === "string" && /^\d{4}-\d{2}$/.test(p) ? p : todayISO().slice(0, 7);
  return v;
}

/** Calendário mensal: férias (aprovadas e pendentes) e entrevistas. Navega por ?mes=AAAA-MM. */
export function MonthCalendar({ month, events, basePath, maxPerDay = 3 }: { month: string; events: CalEvent[]; basePath: string; maxPerDay?: number }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const today = todayISO();
  const prev = new Date(y, m - 2, 1).toLocaleDateString("sv-SE").slice(0, 7);
  const next = new Date(y, m, 1).toLocaleDateString("sv-SE").slice(0, 7);
  const sep = basePath.includes("?") ? "&" : "?";

  return (
    <div>
      <div className="row between" style={{ padding: "12px 18px" }}>
        <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--navy-900)" }}>
          {MONTHS[m - 1]} de {y}
        </strong>
        <div className="row" style={{ "--gap": "4px" } as React.CSSProperties}>
          <Link className="btn btn--outline btn--icon btn--sm" href={`${basePath}${sep}mes=${prev}`} aria-label="Mês anterior" scroll={false}>
            <ChevronLeft aria-hidden />
          </Link>
          <Link className="btn btn--outline btn--sm" href={`${basePath}${sep}mes=${today.slice(0, 7)}`} scroll={false}>
            Hoje
          </Link>
          <Link className="btn btn--outline btn--icon btn--sm" href={`${basePath}${sep}mes=${next}`} aria-label="Próximo mês" scroll={false}>
            <ChevronRight aria-hidden />
          </Link>
        </div>
      </div>
      <div className="cal" role="grid" aria-label={`Calendário de ${MONTHS[m - 1]} de ${y}`}>
        {DOW.map((d) => (
          <div key={d} className="cal__dow" role="columnheader">
            {d}
          </div>
        ))}
        {Array.from({ length: cells }, (_, i) => {
          const date = new Date(y, m - 1, i - startOffset + 1);
          const iso = date.toLocaleDateString("sv-SE");
          const inMonth = date.getMonth() === m - 1;
          const evs = events.filter((e) => e.start <= iso && e.end >= iso);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div
              key={iso}
              role="gridcell"
              className={`cal__day ${inMonth ? "" : "is-out"} ${weekend && inMonth ? "is-weekend" : ""} ${iso === today ? "is-today" : ""}`}
              aria-label={`${date.getDate()} de ${MONTHS[date.getMonth()]}${evs.length ? `: ${evs.map((e) => e.label).join(", ")}` : ""}`}
            >
              <span className="cal__num">{date.getDate()}</span>
              {evs.slice(0, maxPerDay).map((e, k) =>
                e.href ? (
                  <Link key={k} href={e.href} className={`cal__ev cal__ev--${e.kind === "vacation" ? "v" : e.kind}`} title={e.label}>
                    {e.label}
                  </Link>
                ) : (
                  <span key={k} className={`cal__ev cal__ev--${e.kind === "vacation" ? "v" : e.kind}`} title={e.label}>
                    {e.label}
                  </span>
                ),
              )}
              {evs.length > maxPerDay ? <span className="cal__more">+{evs.length - maxPerDay}</span> : null}
            </div>
          );
        })}
      </div>
      <div className="legend" style={{ padding: "12px 18px" }}>
        <span>
          <i style={{ background: "var(--navy-100)", borderLeft: "2px solid var(--navy-500)" }} />
          Férias aprovadas
        </span>
        <span>
          <i style={{ background: "var(--warning-bg)", borderLeft: "2px solid var(--warning)" }} />
          Férias pendentes
        </span>
        <span>
          <i style={{ background: "var(--signal-soft)", borderLeft: "2px solid #c7b800" }} />
          Entrevistas
        </span>
      </div>
    </div>
  );
}
