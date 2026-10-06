"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/** Cores usadas nas tabelas do catálogo (padrão de cores de fusíveis automotivos). */
const COLORS: Record<string, string> = {
  preto: "#1b1b1b",
  cinza: "#9aa0a6",
  violeta: "#7c4dbd",
  rosa: "#f08bb4",
  laranja: "#f28c28",
  marrom: "#7a4a24",
  vermelho: "#d62d20",
  azul: "#2a6fdb",
  amarelo: "#f6d31c",
  cristal: "#eef3f6",
  transparente: "#eef3f6",
  verde: "#2e9e4f",
  "verde claro": "#8fd16a",
  bege: "#e3cfa6",
  branco: "#ffffff",
  "azul claro": "#7ec3f0",
  "rosa claro": "#f7c4d8",
  roxo: "#7c4dbd",
  dourado: "#c9a43a",
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function SpecTable(props: { columns: string[]; rows: string[][]; fromUrl?: boolean }) {
  return props.fromUrl ? <SpecTableFromUrl {...props} /> : <SpecTableInner {...props} />;
}

/** Destaca a linha do código buscado no catálogo (?codigo=). */
function SpecTableFromUrl(props: { columns: string[]; rows: string[][] }) {
  const highlight = useSearchParams().get("codigo") ?? undefined;
  return <SpecTableInner {...props} highlight={highlight} />;
}

function SpecTableInner({ columns, rows, highlight }: { columns: string[]; rows: string[][]; highlight?: string }) {
  const [q, setQ] = useState("");
  const colorIdx = columns.findIndex((c) => c.toLowerCase() === "cor");
  const filtered = useMemo(() => {
    const n = norm(q.trim());
    return n ? rows.filter((r) => r.some((c) => norm(c).includes(n))) : rows;
  }, [rows, q]);
  const hl = highlight ? norm(highlight) : "";

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Especificações técnicas · {rows.length} {rows.length === 1 ? "item" : "itens"}</h2>
        {rows.length > 6 ? (
          <div className="input-icon" style={{ width: 220 }}>
            <Search aria-hidden />
            <label htmlFor="filtro-tabela" className="sr-only">
              Filtrar tabela
            </label>
            <input id="filtro-tabela" className="input input--sm" type="search" placeholder="Filtrar código ou valor" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        ) : null}
      </div>
      <div className="table-wrap">
        <table className="table spec-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, n) => (
              <tr key={n} className={hl && r.some((c) => norm(c) === hl) ? "is-hl" : undefined}>
                {r.map((cell, ci) => (
                  <td key={ci}>
                    {ci === colorIdx && cell ? (
                      <span className="swatch">
                        <i style={{ background: COLORS[norm(cell).replace(/[;.]/g, "").trim()] ?? "transparent" }} aria-hidden />
                        {cell.replace(/;$/, "")}
                      </span>
                    ) : (
                      cell || "—"
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="muted">
                  Nenhum item corresponde ao filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
