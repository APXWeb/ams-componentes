import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Building2, CalendarDays, MapPin, Users } from "lucide-react";
import { ApplyForm } from "@/components/site/public-forms";
import { getOpenVacancy } from "@/lib/public-data";
import { EMPLOYMENT_LABEL } from "@/lib/labels";
import { fmtDateLong } from "@/lib/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/trabalhe-conosco/[slug]">): Promise<Metadata> {
  const v = getOpenVacancy((await params).slug);
  if (!v) return { title: "Vaga não encontrada" };
  return {
    title: `${v.title} · Trabalhe conosco`,
    description: `${v.title} na AMS Componentes (${v.location}). ${v.summary}`,
    alternates: { canonical: `/trabalhe-conosco/${v.slug}` },
  };
}

const lines = (s: string | null) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

export default async function VagaPage({ params }: PageProps<"/trabalhe-conosco/[slug]">) {
  const v = getOpenVacancy((await params).slug);
  if (!v) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.title,
    description: [v.summary, v.description, v.requirements].join("\n"),
    datePosted: v.publishedAt?.slice(0, 10),
    employmentType: v.employmentType === "ESTAGIO" ? "INTERN" : v.employmentType === "TEMPORARIO" ? "TEMPORARY" : "FULL_TIME",
    hiringOrganization: { "@type": "Organization", name: SITE.name, sameAs: SITE.url },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: SITE.city, addressRegion: SITE.state, addressCountry: "BR" } },
  };

  return (
    <>
      {!v.isDemo ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
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
          {v.isDemo ? (
            <p style={{ marginTop: 16 }}>
              <span className="demo-flag">Vaga fictícia do ambiente de demonstração</span>
            </p>
          ) : null}
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
          </article>
          <aside className="form-card ticks" aria-labelledby="candidatura-title" id="candidatura">
            <h2 id="candidatura-title" style={{ fontSize: "var(--fs-xl)" }}>
              Candidate-se
            </h2>
            <p className="small muted" style={{ margin: "6px 0 20px" }}>
              Leva cerca de 2 minutos. Seus dados vão direto para o RH da AMS.
            </p>
            <ApplyForm vacancyId={v.id} vacancyTitle={v.title} />
          </aside>
        </div>
      </section>
    </>
  );
}
