"use client";

import { useEffect, useState } from "react";

export type SpecSlide = { name: string; group: string; image: string; codes: string; count: number; href: string };

/** Placa de desenho técnico que alterna produtos reais do catálogo, com cotas desenhadas. */
export function SpecPlate({ slides }: { slides: SpecSlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5200);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  const s = slides[i];
  return (
    <div
      className="spec"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="group"
      aria-roledescription="carrossel"
      aria-label="Produtos em destaque"
    >
      <div className="spec__dots" role="tablist" aria-label="Escolher produto">
        {slides.map((sl, n) => (
          <button key={sl.name} type="button" role="tab" aria-selected={n === i} aria-current={n === i} aria-label={sl.name} onClick={() => setI(n)} />
        ))}
      </div>
      <div className="dim dim--v" aria-hidden>
        <svg width="40" height="100%" viewBox="0 0 40 100" preserveAspectRatio="none">
          <path className="dim__draw" d="M10 2 V98 M4 2 H40 M4 98 H40" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="dim__text">LINHA {s.group.toUpperCase()}</span>
      </div>
      <div className="dim dim--h" aria-hidden>
        <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path className="dim__draw" d="M2 12 H98 M2 0 V18 M98 0 V18" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="dim__text">{s.codes}</span>
      </div>
      <a className="spec__plate" href={s.href} aria-label={`Ver ${s.name}`}>
        <span className="spec__corner">AMS · FOLHA {String(i + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")}</span>
        {slides.map((sl, n) => (
          <div key={sl.name} className={`spec__slide ${n === i ? "is-active" : ""}`} aria-hidden={n !== i}>
            <div className="spec__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sl.image} alt="" width={600} height={600} fetchPriority={n === 0 ? "high" : "low"} />
            </div>
          </div>
        ))}
        <span className="spec__label" aria-live="polite">
          <span>
            {s.group}
            <strong>{s.name}</strong>
          </span>
          <span>{s.count} códigos</span>
        </span>
      </a>
    </div>
  );
}
