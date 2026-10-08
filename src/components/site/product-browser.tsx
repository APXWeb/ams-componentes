"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Search, X, PackageSearch } from "lucide-react";

export type BrowserItem = {
  slug: string;
  name: string;
  group: string;
  category: string;
  image?: string;
  launch: boolean;
  count: number;
  /** texto pesquisável: códigos, aplicação, grupo */
  haystack: string;
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ProductBrowser({
  items,
  categories,
  initialCategory,
  initialQuery,
}: {
  items: BrowserItem[];
  categories: { slug: string; name: string }[];
  initialCategory: string;
  initialQuery: string;
}) {
  const [cat, setCat] = useState(initialCategory);
  const [q, setQ] = useState(initialQuery);
  const dq = useDeferredValue(q);
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const sync = (nextCat: string, nextQ: string) => {
    const sp = new URLSearchParams();
    if (nextCat) sp.set("linha", nextCat);
    if (nextQ.trim()) sp.set("q", nextQ.trim());
    startTransition(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  const filtered = useMemo(() => {
    const n = norm(dq.trim());
    return items.filter((p) => (!cat || p.category === cat) && (!n || norm(p.name).includes(n) || p.haystack.includes(n)));
  }, [items, cat, dq]);

  const counts = useMemo(() => {
    const n = norm(dq.trim());
    const m: Record<string, number> = {};
    for (const p of items) if (!n || norm(p.name).includes(n) || p.haystack.includes(n)) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [items, dq]);

  const groups = useMemo(() => {
    const out: { key: string; title: string; items: BrowserItem[] }[] = [];
    for (const p of filtered) {
      const catName = categories.find((c) => c.slug === p.category)?.name ?? "";
      const title = cat ? (p.group === catName ? catName : p.group) : catName;
      const key = cat ? `${p.category}:${p.group}` : p.category;
      let g = out.find((x) => x.key === key);
      if (!g) out.push((g = { key, title, items: [] }));
      g.items.push(p);
    }
    return out;
  }, [filtered, categories, cat]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const filterButtons = (
    <>
      <li>
        <button type="button" className="filter-btn" aria-pressed={!cat} onClick={() => (setCat(""), sync("", q))}>
          Todas as linhas <span className="mono">{total}</span>
        </button>
      </li>
      {categories.map((c) => (
        <li key={c.slug}>
          <button type="button" className="filter-btn" aria-pressed={cat === c.slug} onClick={() => (setCat(c.slug), sync(c.slug, q))}>
            {c.name} <span className="mono">{counts[c.slug] ?? 0}</span>
          </button>
        </li>
      ))}
    </>
  );

  return (
    <div className="catalog-layout">
      <aside className="filters" aria-label="Filtros do catálogo">
        <div className="field">
          <label className="label" htmlFor="busca-produto">
            Buscar por nome ou código
          </label>
          <div className="input-icon">
            <Search aria-hidden />
            <input
              id="busca-produto"
              className="input"
              type="search"
              placeholder="Ex.: 17010, mega, cordoalha"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                sync(cat, e.target.value);
              }}
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <span className="eyebrow" style={{ marginBottom: 10, display: "flex" }}>
            Linhas
          </span>
          <ul className="filter-list">{filterButtons}</ul>
          <ul className="chips" style={{ listStyle: "none", margin: 0 }}>
            {filterButtons}
          </ul>
        </div>
      </aside>

      <div>
        <div className="results-bar" aria-live="polite">
          <span>
            <strong className="tabular" style={{ color: "var(--navy-900)" }}>
              {filtered.length}
            </strong>{" "}
            {filtered.length === 1 ? "produto" : "produtos"}
            {dq.trim() ? (
              <>
                {" "}
                para <strong>“{dq.trim()}”</strong>
              </>
            ) : null}
          </span>
          {cat || q ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCat("");
                setQ("");
                sync("", "");
              }}
            >
              <X aria-hidden /> Limpar filtros
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="empty panel">
            <span className="empty__icon">
              <PackageSearch aria-hidden />
            </span>
            <strong>Nenhum produto encontrado</strong>
            <p>Confira o código digitado ou fale com a AMS: ajudamos a encontrar o item certo para a sua aplicação.</p>
            <Link href="/contato" className="btn btn--outline" style={{ marginTop: 10 }}>
              Falar com a AMS
            </Link>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-label={g.title}>
              <h2 className="group-title">
                {g.title} <span className="subtle">({g.items.length})</span>
              </h2>
              <div className="product-grid">
                {g.items.map((p) => (
                  <article key={p.slug} className="p-card ticks">
                    <div className="p-card__img">
                      {p.image ? <Image src={p.image} alt="" width={300} height={300} sizes="(max-width: 900px) 45vw, 240px" /> : null}
                      {p.launch ? <span className="p-card__badge badge badge--brand">Lançamento</span> : null}
                    </div>
                    <div className="p-card__body">
                      <span className="p-card__group">{p.group}</span>
                      <h3 className="p-card__name">
                        <Link href={`/produtos/${p.slug}${dq.trim() ? `?codigo=${encodeURIComponent(dq.trim())}` : ""}`}>{p.name}</Link>
                      </h3>
                      {p.count ? (
                        <span className="p-card__codes">
                          {p.count} {p.count === 1 ? "código" : "códigos"}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/** Lê ?linha= e ?q= da URL no navegador (o HTML estático sai com o catálogo completo). */
export function ProductBrowserFromUrl({ items, categories }: { items: BrowserItem[]; categories: { slug: string; name: string }[] }) {
  const sp = useSearchParams();
  const linha = sp.get("linha") ?? "";
  const q = (sp.get("q") ?? "").slice(0, 60);
  return <ProductBrowser items={items} categories={categories} initialCategory={categories.some((c) => c.slug === linha) ? linha : ""} initialQuery={q} />;
}
