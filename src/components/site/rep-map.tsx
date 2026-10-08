"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, Phone, User, Building2 } from "lucide-react";
import type { Rep } from "@/lib/site";

/* Cartograma em grade: cada estado ocupa uma célula aproximando sua posição no mapa do Brasil. */
const POS: Record<string, [number, number]> = {
  RR: [1, 3], AP: [1, 4],
  AM: [2, 2], PA: [2, 3], MA: [2, 4], CE: [2, 5], RN: [2, 6],
  AC: [3, 1], RO: [3, 2], TO: [3, 3], PI: [3, 4], PB: [3, 6], PE: [3, 5],
  MT: [4, 2], GO: [4, 3], BA: [4, 4], AL: [4, 6], SE: [4, 5],
  MS: [5, 2], DF: [5, 3], MG: [5, 4], ES: [5, 5],
  PR: [6, 2], SP: [6, 3], RJ: [6, 4],
  SC: [7, 2],
  RS: [8, 2],
};

type State = { uf: string; name: string; reps: Rep[] };

export function RepMap({ states, initial, directContact }: { states: State[]; initial: string; directContact: React.ReactNode }) {
  const [uf, setUf] = useState(initial);
  const router = useRouter();
  const [, start] = useTransition();
  const sel = states.find((s) => s.uf === uf)!;
  const choose = (next: string) => {
    setUf(next);
    start(() => router.replace(`/representantes?uf=${next}`, { scroll: false }));
  };

  return (
    <div className="rep-layout">
      <div className="stack" style={{ "--gap": "18px" } as React.CSSProperties}>
        <div className="field" style={{ maxWidth: 360 }}>
          <label className="label" htmlFor="uf-select">
            Selecione o estado
          </label>
          <select id="uf-select" className="select" value={uf} onChange={(e) => choose(e.target.value)}>
            {states.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.name} ({s.uf})
              </option>
            ))}
          </select>
        </div>
        <div className="tilemap" role="group" aria-label="Mapa de estados">
          {states.map((s) => (
            <button
              key={s.uf}
              type="button"
              className={`tile ${s.reps.length ? "has-rep" : "no-rep"}`}
              style={{ gridRow: POS[s.uf][0], gridColumn: POS[s.uf][1] }}
              aria-pressed={s.uf === uf}
              aria-label={`${s.name}${s.reps.length ? "" : ", sem representante: atendimento direto"}`}
              title={s.name}
              onClick={() => choose(s.uf)}
            >
              {s.uf}
            </button>
          ))}
        </div>
        <div className="row small muted" style={{ "--gap": "18px" } as React.CSSProperties}>
          <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
            <i style={{ width: 12, height: 12, background: "var(--navy-50)", border: "1px solid var(--navy-200)", borderRadius: 2 }} /> Com representante
          </span>
          <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
            <i style={{ width: 12, height: 12, background: "var(--steel-25)", border: "1px solid var(--line)", borderRadius: 2 }} /> Atendimento direto
          </span>
        </div>
      </div>

      <div className="stack" aria-live="polite" style={{ "--gap": "12px" } as React.CSSProperties}>
        <div>
          <span className="eyebrow">{sel.uf}</span>
          <h2 style={{ fontSize: "var(--fs-2xl)", marginTop: 8 }}>{sel.name}</h2>
        </div>
        {sel.reps.length ? (
          sel.reps.map((r) => (
            <article key={r.name} className="rep-card" >
              <h3>{r.name}</h3>
              <dl>
                {r.company ? (
                  <>
                    <dt>
                      <Building2 size={13} aria-hidden style={{ display: "inline" }} /> Empresa
                    </dt>
                    <dd>{r.company}</dd>
                  </>
                ) : null}
                <dt>
                  <User size={13} aria-hidden style={{ display: "inline" }} /> Contato
                </dt>
                <dd>{r.contact}</dd>
                <dt>
                  <Phone size={13} aria-hidden style={{ display: "inline" }} /> Telefone
                </dt>
                <dd>
                  {r.phones.map((p, i) => (
                    <span key={p}>
                      {i ? " · " : ""}
                      <a className="link" href={`tel:+55${p.replace(/\D/g, "")}`}>
                        {p}
                      </a>
                    </span>
                  ))}
                </dd>
                {r.email ? (
                  <>
                    <dt>
                      <Mail size={13} aria-hidden style={{ display: "inline" }} /> E-mail
                    </dt>
                    <dd style={{ overflowWrap: "anywhere" }}>
                      <a className="link" href={`mailto:${r.email}`}>
                        {r.email}
                      </a>
                    </dd>
                  </>
                ) : null}
              </dl>
            </article>
          ))
        ) : (
          <div className="rep-card">
            <h3>Atendimento direto pela AMS</h3>
            <p className="small muted">Este estado é atendido diretamente pela equipe comercial da fábrica.</p>
            {directContact}
          </div>
        )}
      </div>
    </div>
  );
}

/** Estado pedido em ?uf= (lido no navegador); sem parâmetro, mostra São Paulo. */
export function RepMapFromUrl({ states, directContact }: { states: State[]; directContact: React.ReactNode }) {
  const asked = (useSearchParams().get("uf") ?? "").toUpperCase();
  const uf = states.some((s) => s.uf === asked) ? asked : "SP";
  return <RepMap key={uf} states={states} initial={uf} directContact={directContact} />;
}
