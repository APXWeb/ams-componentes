"use client";

import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { CalendarClock, GripVertical, MapPin, Search, Star } from "lucide-react";
import type { Stage } from "@/db/schema";
import { useToast } from "@/components/ui/toast";
import { moveApplication } from "@/app/rh/(app)/recrutamento/actions";

export type KCard = {
  id: number;
  name: string;
  city: string;
  stage: Stage;
  rating: number | null;
  vacancy: string;
  interviewAt: string | null;
  lastActivityAt: string;
  createdAt: string;
};

const COLS: { stage: Stage; label: string; hint: string }[] = [
  { stage: "CANDIDATO", label: "Candidato", hint: "Novas candidaturas do site" },
  { stage: "TRIAGEM", label: "Triagem", hint: "Currículo em análise" },
  { stage: "ENTREVISTA", label: "Entrevista", hint: "Entrevista marcada ou feita" },
  { stage: "AVALIACAO", label: "Avaliação", hint: "Prova prática, referências" },
  { stage: "APROVADO", label: "Aprovado", hint: "Pronto para contratar" },
  { stage: "CONTRATADO", label: "Contratado", hint: "Admissão concluída" },
];

function since(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "hoje" : d === 1 ? "1 dia" : `${d} dias`;
}

/**
 * Quadro do pipeline. Arraste os cartões (mouse) ou use o seletor de etapa em cada cartão
 * (teclado e celular). A mudança é otimista e confirmada pelo servidor, que grava o histórico.
 */
export function Kanban({ cards, editable, showVacancy }: { cards: KCard[]; editable: boolean; showVacancy: boolean }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [optimistic, applyMove] = useOptimistic(cards, (state, m: { id: number; stage: Stage }) => state.map((c) => (c.id === m.id ? { ...c, stage: m.stage, lastActivityAt: new Date().toISOString() } : c)));
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [moved, setMoved] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? optimistic.filter((c) => c.name.toLowerCase().includes(n) || c.city.toLowerCase().includes(n) || c.vacancy.toLowerCase().includes(n)) : optimistic;
  }, [optimistic, q]);
  const total = optimistic.filter((c) => c.stage !== "CONTRATADO").length || 1;

  const move = (id: number, stage: Stage) => {
    const card = optimistic.find((c) => c.id === id);
    if (!card || card.stage === stage) return;
    if (stage === "CONTRATADO") {
      toast("Para contratar, abra o candidato aprovado e use Contratar.", "error");
      return;
    }
    startTransition(async () => {
      applyMove({ id, stage });
      const res = await moveApplication(id, stage);
      toast(res.message ?? "", res.ok ? "success" : "error");
      if (res.ok) {
        setMoved(id);
        setTimeout(() => setMoved(null), 700);
      }
    });
  };

  return (
    <div>
      <div className="row wrap between" style={{ marginBottom: 12 }}>
        <div className="input-icon" style={{ flex: "1 1 260px", maxWidth: 360 }}>
          <Search aria-hidden />
          <label htmlFor="kanban-q" className="sr-only">
            Filtrar candidatos
          </label>
          <input id="kanban-q" className="input input--sm" type="search" placeholder="Filtrar por nome, cidade ou vaga" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {editable ? (
          <span className="xsmall subtle row" style={{ "--gap": "6px" } as React.CSSProperties}>
            <GripVertical size={14} aria-hidden /> Arraste os cartões ou use o seletor de etapa
          </span>
        ) : (
          <span className="xsmall subtle">Visualização somente leitura</span>
        )}
      </div>
      <div className="kanban" role="list" aria-label="Etapas do processo seletivo">
        {COLS.map((col, idx) => {
          const items = filtered.filter((c) => c.stage === col.stage);
          const share = Math.round((optimistic.filter((c) => c.stage === col.stage).length / total) * 100);
          return (
            <section
              key={col.stage}
              role="listitem"
              aria-label={`${col.label}: ${items.length}`}
              className={`kcol ${col.stage === "CONTRATADO" ? "kcol--final" : ""} ${over === col.stage ? "is-over" : ""}`}
              onDragOver={(e) => {
                if (!editable || dragId == null) return;
                e.preventDefault();
                setOver(col.stage);
              }}
              onDragLeave={() => setOver((o) => (o === col.stage ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragId != null) move(dragId, col.stage);
                setDragId(null);
              }}
            >
              <header className="kcol__head" title={col.hint}>
                <span className="kcol__step">{String(idx + 1).padStart(2, "0")}</span>
                <h2 className="kcol__name">{col.label}</h2>
                <span className="kcol__count">{items.length}</span>
              </header>
              <div className="kcol__bar" aria-hidden>
                <i style={{ width: `${col.stage === "CONTRATADO" ? 100 : share}%`, transition: "width 400ms" }} />
              </div>
              <div className="kcol__body">
                {items.length === 0 ? <div className="kempty">{q ? "Nenhum resultado" : col.hint}</div> : null}
                {items.map((c) => (
                  <article
                    key={c.id}
                    className={`kcard ${dragId === c.id ? "is-dragging" : ""} ${moved === c.id ? "is-moved" : ""}`}
                    draggable={editable && c.stage !== "CONTRATADO"}
                    onDragStart={(e) => {
                      setDragId(c.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(c.id));
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOver(null);
                    }}
                  >
                    <div className="kcard__top">
                      <span className="avatar avatar--sm" aria-hidden>
                        {c.name
                          .split(" ")
                          .map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : ""))
                          .join("")}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="kcard__name">
                          <Link href={`/rh/candidatos/${c.id}`}>{c.name}</Link>
                        </div>
                        <div className="kcard__sub truncate">
                          <MapPin size={11} aria-hidden style={{ display: "inline", verticalAlign: "-1px" }} /> {c.city}
                          {showVacancy ? ` · ${c.vacancy}` : ""}
                        </div>
                      </div>
                    </div>
                    {c.interviewAt && c.stage !== "CONTRATADO" ? (
                      <div className="xsmall row" style={{ "--gap": "6px", color: "var(--navy-700)", fontWeight: 600 } as React.CSSProperties}>
                        <CalendarClock size={13} aria-hidden />
                        {new Date(c.interviewAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    ) : null}
                    <div className="kcard__foot">
                      <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
                        {c.rating ? (
                          <span className="stars" aria-label={`Avaliação ${c.rating} de 5`}>
                            <Star className="on" aria-hidden /> <span className="mono">{c.rating}</span>
                          </span>
                        ) : null}
                        <span title="Tempo desde a última movimentação">{since(c.lastActivityAt)}</span>
                      </span>
                      {editable && c.stage !== "CONTRATADO" ? (
                        <span className="kcard__move">
                          <label htmlFor={`mv-${c.id}`} className="sr-only">
                            Mover {c.name} para
                          </label>
                          <select id={`mv-${c.id}`} className="select" value={c.stage} onChange={(e) => move(c.id, e.target.value as Stage)}>
                            {COLS.filter((x) => x.stage !== "CONTRATADO").map((x) => (
                              <option key={x.stage} value={x.stage}>
                                {x.label}
                              </option>
                            ))}
                          </select>
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
