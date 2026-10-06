"use client";

import { useState } from "react";
import { Star } from "lucide-react";

/** Avaliação de 1 a 5 com radios nativos (funciona com teclado: setas mudam a nota). */
export function RatingInput({ name, defaultValue }: { name: string; defaultValue: number | null }) {
  const [value, setValue] = useState(defaultValue ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label" style={{ marginBottom: 6 }}>
        Avaliação geral
      </legend>
      <div className="row" style={{ "--gap": "2px" } as React.CSSProperties} onMouseLeave={() => setHover(0)}>
        <input type="radio" name={name} value="0" checked={value === 0} onChange={() => setValue(0)} className="sr-only" aria-label="Sem avaliação" />
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} style={{ cursor: "pointer", padding: 2 }} onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => setValue(n)} className="sr-only" aria-label={`${n} de 5`} />
            <Star
              size={24}
              aria-hidden
              style={{ color: n <= shown ? "#d6a400" : "var(--steel-300)", fill: n <= shown ? "#f2c94c" : "transparent", transition: "transform 120ms", transform: hover === n ? "scale(1.15)" : "none" }}
            />
          </label>
        ))}
        <span className="small muted" style={{ marginLeft: 8 }}>
          {value ? `${value} de 5` : "Sem nota"}
        </span>
      </div>
    </fieldset>
  );
}
