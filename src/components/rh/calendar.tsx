"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayISO } from "@/lib/format";
import type { CalEvent } from "@/lib/demo/queries";

export type { CalEvent };

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function monthFromParam(p?: string | string[] | null) {
  return typeof p === "string" && /^\d{4}-\d{2}$/.test(p) ? p : todayISO().slice(0, 7);
}

/**
 * Calendário mensal: férias (aprovadas e pendentes) e entrevistas. Navega por ?mes=AAAA-MM;
 * clicar num dia mostra a agenda dele logo abaixo.
 */
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
  const [selected, setSelected] = useState<string | null>(null);
  const selEvents = selected ? events.filter((e) => e.start <= selected && e.end >= selected) : [];

  return (
    <div>
      <div className="row between" style={{ padding: "12px 18px" }}>
        <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--navy-900)" }}>
          {MONTHS[m - 1]} de {y}
        </strong>
        <div className="row" style={{ "--gap": "4px" } as React.CSSProperties}>
          <Link className="btn btn--outline btn--icon btn--sm" href={`${basePath}${sep}mes=${prev}`} aria-label="Mês anterior" scroll={false} onClick={() => setSelected(null)}>
            <ChevronLeft aria-hidden />
          </Link>
          <Link className="btn btn--outline btn--sm" href={`${basePath}${sep}mes=${today.slice(0, 7)}`} scroll={false} onClick={() => setSelected(today)}>
            Hoje
          </Link>
          <Link className="btn btn--outline btn--icon btn--sm" href={`${basePath}${sep}mes=${next}`} aria-label="Próximo mês" scroll={false} onClick={() => setSelected(null)}>
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
              tabIndex={inMonth ? 0 : -1}
              aria-selected={selected === iso}
              className={`cal__day ${inMonth ? "" : "is-out"} ${weekend && inMonth ? "is-weekend" : ""} ${iso === today ? "is-today" : ""} ${selected === iso ? "is-selected" : ""}`}
              aria-label={`${date.getDate()} de ${MONTHS[date.getMonth()]}${evs.length ? `: ${evs.map((e) => e.label).join(", ")}` : ""}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) return;
                setSelected((s) => (s === iso ? null : iso));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected((s) => (s === iso ? null : iso));
                }
              }}
            >
              <span className="cal__num">{date.getDate()}</span>
              {evs.slice(0, maxPerDay).map((e, k) =>
                e.href ? (
                  <Link key={k} href={e.href} className={`cal__ev cal__ev--${e.kind === "vacation" ? "v" : e.kind}`} title={e.detail ?? e.label}>
                    {e.label}
                  </Link>
                ) : (
                  <span key={k} className={`cal__ev cal__ev--${e.kind === "vacation" ? "v" : e.kind}`} title={e.detail ?? e.label}>
                    {e.label}
                  </span>
                ),
              )}
              {evs.length > maxPerDay ? <span className="cal__more">+{evs.length - maxPerDay}</span> : null}
            </div>
          );
        })}
      </div>
      {selected ? (
        <div className="cal__agenda" aria-live="polite">
          <h3>
            {new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </h3>
          {selEvents.length ? (
            <ul>
              {selEvents.map((e, k) => (
                <li key={k}>
                  <Link href={e.href ?? "#"}>
                    <i className={e.kind === "vacation" ? "" : e.kind} aria-hidden />
                    {e.detail ?? e.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Nenhuma férias ou entrevista neste dia.</p>
          )}
        </div>
      ) : null}
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
        <span className="subtle">Clique num dia para ver a agenda</span>
      </div>
    </div>
  );
}
