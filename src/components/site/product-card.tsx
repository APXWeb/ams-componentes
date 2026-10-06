import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog";

export function ProductCard({ p, priority }: { p: Product; priority?: boolean }) {
  return (
    <article className="p-card ticks">
      <div className="p-card__img">
        {p.images[0] ? <Image src={p.images[0]} alt="" width={300} height={300} sizes="(max-width: 900px) 45vw, 240px" priority={priority} /> : null}
        {p.launch ? (
          <span className="p-card__badge badge badge--brand">Lançamento</span>
        ) : null}
      </div>
      <div className="p-card__body">
        <span className="p-card__group">{p.group}</span>
        <h3 className="p-card__name">
          <Link href={`/produtos/${p.slug}`}>{p.name}</Link>
        </h3>
        {p.rows.length ? <span className="p-card__codes">{p.rows.length} {p.rows.length === 1 ? "código" : "códigos"}</span> : null}
      </div>
    </article>
  );
}
