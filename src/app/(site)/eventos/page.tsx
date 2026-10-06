import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { AGENDA, PAST_EVENTS } from "@/lib/site";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = {
  title: "Eventos",
  description: "Agenda de feiras da AMS Componentes e fotos da participação em eventos do setor de autopeças.",
  alternates: { canonical: "/eventos" },
};

export const revalidate = 3600;

export default function EventosPage() {
  const today = todayISO();
  return (
    <>
      <section className="page-head page-head--light">
        <div className="container">
          <ol className="crumbs">
            <li>
              <Link href="/">Início</Link>
            </li>
            <li aria-current="page">Eventos</li>
          </ol>
          <h1>Eventos e feiras</h1>
          <p className="lede">Onde a AMS encontra distribuidores, varejistas e parceiros do setor de autopeças.</p>
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 28 }}>
            <span className="eyebrow">Agenda 2026</span>
          </div>
          <div className="agenda">
            {AGENDA.map((e) => {
              const status = today > e.end ? "Realizado" : today >= e.start ? "Acontecendo agora" : "Próximo";
              return (
                <article key={e.name} className="agenda-card" data-reveal>
                  <Image src={e.image} alt={`Logotipo da feira ${e.name}`} width={600} height={450} sizes="(max-width: 900px) 100vw, 33vw" />
                  <div className="agenda-card__body">
                    <span className={`badge ${status === "Realizado" ? "" : "badge--success"}`}>{status}</span>
                    <h2 style={{ fontSize: "1.35rem" }}>{e.name}</h2>
                    <p className="small muted row" style={{ "--gap": "6px" } as React.CSSProperties}>
                      <CalendarDays size={15} aria-hidden /> {e.dates}
                    </p>
                    <p className="small muted row" style={{ "--gap": "6px" } as React.CSSProperties}>
                      <MapPin size={15} aria-hidden /> {e.city}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section--tight section--sunken">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 28 }}>
            <span className="eyebrow">Galeria</span>
            <h2 style={{ fontSize: "var(--fs-2xl)" }}>Participações em feiras</h2>
          </div>
          <div className="gallery-grid">
            {PAST_EVENTS.flatMap((ev) =>
              ev.photos.map((src, i) => (
                <figure key={src} data-reveal>
                  <Image src={src} alt={`AMS na ${ev.name}${ev.photos.length > 1 ? `, foto ${i + 1}` : ""}`} width={900} height={700} sizes="(max-width: 700px) 100vw, 33vw" style={{ height: "auto" }} />
                  <figcaption>
                    {ev.name.toUpperCase()} · {ev.year}
                  </figcaption>
                </figure>
              )),
            )}
          </div>
        </div>
      </section>
    </>
  );
}
