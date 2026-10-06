"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";

export type ShowcaseItem = { name: string; group: string; image: string; codes: string; count: number; href: string };
export type ShowcaseLaunch = { name: string; image: string; href: string };

/**
 * Lado direito da primeira tela: painel azul de ponta a ponta com os produtos AMS
 * alternando e dois cartões flutuantes (lançamento e ficha do produto em destaque).
 */
export function HeroShowcase({ items, launch }: { items: ShowcaseItem[]; launch?: ShowcaseLaunch }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  const cur = items[i];
  return (
    <div className="showcase" role="group" aria-roledescription="carrossel" aria-label="Produtos em destaque">
      <div className="showcase__stage" aria-hidden>
        {items.map((it, n) => (
          <div key={it.name} className={`showcase__slide ${n === i ? "is-active" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.image} alt="" width={720} height={720} fetchPriority={n === 0 ? "high" : "low"} />
          </div>
        ))}
      </div>

      {launch ? (
        <Link href={launch.href} className="float-card float-card--top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={launch.image} alt="" width={84} height={84} />
          <span>
            <span className="float-card__label">Lançamento</span>
            <strong>{launch.name}</strong>
            <span className="float-card__sub">Confira as especificações</span>
          </span>
        </Link>
      ) : null}

      <Link href={cur.href} className="float-card float-card--bottom" aria-live="polite">
        <span>
          <span className="float-card__label">{cur.group}</span>
          <strong>{cur.name}</strong>
          <span className="float-card__sub">
            {cur.count} códigos{cur.codes ? ` · ${cur.codes}` : ""}
          </span>
        </span>
        <span className="float-card__go" aria-hidden>
          <ArrowRight />
        </span>
      </Link>

      <div className="showcase__controls">
        <div className="showcase__dots" role="tablist" aria-label="Escolher produto">
          {items.map((it, n) => (
            <button key={it.name} type="button" role="tab" aria-selected={n === i} aria-label={it.name} onClick={() => setI(n)} />
          ))}
        </div>
        <button type="button" className="showcase__pause" aria-pressed={paused} aria-label={paused ? "Retomar troca de produtos" : "Pausar troca de produtos"} onClick={() => setPaused((p) => !p)}>
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        </button>
      </div>
    </div>
  );
}
