"use client";

import Link from "next/link";
import { Briefcase, Building2, CalendarDays, MapPin, SearchX, Users, Clock, ShieldCheck } from "lucide-react";
import { ApplyForm } from "@/components/site/public-forms";
import { useOpenVacancies } from "@/components/site/job-list";
import type { PublicVacancy } from "@/lib/demo/public";
import { EMPLOYMENT_LABEL } from "@/lib/labels";
import { fmtDateLong } from "@/lib/format";
import { SITE } from "@/lib/site";

const lines = (s: string | null) =>
  (s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function VacancyDetail({ slug, initial }: { slug: string; initial: PublicVacancy[] }) {
  const all = useOpenVacancies(initial);
  const v = all.find((x) => x.slug === slug);

  if (!v) {
    return (
      <section className="section">
        <div className="container">
          <div className="panel empty" style={{ padding: 56 }}>
            <span className="empty__icon">
              <SearchX aria-hidden />
            </span>
            <strong>Esta vaga não está mais aberta</strong>
            <p>Ela pode ter sido preenchida ou encerrada. Veja as outras oportunidades da AMS.</p>
            <Link href="/trabalhe-conosco#vagas" className="btn" style={{ marginTop: 10 }}>
              Ver vagas abertas
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-head page-head--light">
        <div className="container">
          <ol className="crumbs">
            <li>
              <Link href="/">Início</Link>
            </li>
            <li>
              <Link href="/trabalhe-conosco">Trabalhe conosco</Link>
            </li>
            <li aria-current="page">{v.title}</li>
          </ol>
          <h1>{v.title}</h1>
          <div className="job__meta" style={{ marginTop: 16 }}>
            <span>
              <Building2 aria-hidden /> {v.department}
            </span>
            <span>
              <MapPin aria-hidden /> {v.location}
            </span>
            <span>
              <Briefcase aria-hidden /> {EMPLOYMENT_LABEL[v.employmentType]}
            </span>
            <span>
              <Users aria-hidden /> {v.openings} {v.openings === 1 ? "vaga" : "vagas"}
            </span>
            <span>
              <CalendarDays aria-hidden /> Publicada em {fmtDateLong(v.publishedAt)}
            </span>
          </div>
          <p style={{ marginTop: 16 }}>
            <span className="demo-flag">Vaga fictícia do projeto conceitual</span>
          </p>
        </div>
      </section>

      <section className="section--tight">
        <div className="container vaga-layout">
          <article className="prose">
            <p className="lede" style={{ marginBottom: 28 }}>
              {v.summary}
            </p>
            <h2>Atividades</h2>
            <ul>
              {lines(v.description).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <h2>Requisitos</h2>
            <ul>
              {lines(v.requirements).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            {v.additionalInfo ? (
              <>
                <h2>Informações adicionais</h2>
                <ul>
                  {lines(v.additionalInfo).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <h2>Local de trabalho</h2>
            <p>
              Matriz da AMS em {SITE.city} ({SITE.state}), na {SITE.region}. Horário de funcionamento: {SITE.hours.toLowerCase()}.
            </p>
            <h2>Como é o processo</h2>
            <ul>
              <li>Triagem do currículo pelo RH</li>
              <li>Entrevista com o RH e o gestor da área</li>
              <li>Avaliação prática, quando a vaga pede</li>
              <li>Retorno com o resultado</li>
            </ul>
          </article>
          <aside className="form-card ticks" aria-labelledby="candidatura-title" id="candidatura">
            <h2 id="candidatura-title" style={{ fontSize: "var(--fs-xl)" }}>
              Candidate-se
            </h2>
            <p className="small muted row" style={{ margin: "6px 0 20px", "--gap": "12px" } as React.CSSProperties}>
              <span className="row" style={{ "--gap": "5px" } as React.CSSProperties}>
                <Clock size={14} aria-hidden /> Cerca de 3 minutos
              </span>
              <span className="row" style={{ "--gap": "5px" } as React.CSSProperties}>
                <ShieldCheck size={14} aria-hidden /> Dados protegidos pela LGPD
              </span>
            </p>
            <ApplyForm vacancyId={v.id} vacancies={all.map((x) => ({ id: x.id, title: x.title }))} />
          </aside>
        </div>
      </section>
    </>
  );
}
