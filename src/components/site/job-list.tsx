"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Briefcase, Building2, MapPin, Users } from "lucide-react";
import { useDemoData } from "@/lib/demo/store";
import { publicVacancies, type PublicVacancy } from "@/lib/demo/public";
import { EMPLOYMENT_LABEL } from "@/lib/labels";
import { relative } from "@/lib/format";
import { LinkedinIcon } from "@/components/ui/brand-icons";
import { SITE } from "@/lib/site";

/** Vagas abertas no estado atual da demonstração (inclui as publicadas pelo RH nesta sessão). */
export function useOpenVacancies(initial: PublicVacancy[]) {
  const d = useDemoData();
  return d ? publicVacancies(d) : initial;
}

export function JobFilters({ initial, area }: { initial: PublicVacancy[]; area: string }) {
  const all = useOpenVacancies(initial);
  const areas = [...new Set(all.map((j) => j.department))];
  if (areas.length < 2) return null;
  return (
    <nav aria-label="Filtrar por área" className="row wrap" style={{ "--gap": "6px" } as React.CSSProperties}>
      <Link href="/trabalhe-conosco#vagas" scroll={false} className={`btn btn--sm ${area ? "btn--outline" : ""}`} aria-current={!area ? "page" : undefined}>
        Todas
      </Link>
      {areas.map((a) => (
        <Link key={a} href={`/trabalhe-conosco?area=${encodeURIComponent(a)}#vagas`} scroll={false} className={`btn btn--sm ${area === a ? "" : "btn--outline"}`} aria-current={area === a ? "page" : undefined}>
          {a}
        </Link>
      ))}
    </nav>
  );
}

export function JobList({ initial, area }: { initial: PublicVacancy[]; area: string }) {
  const all = useOpenVacancies(initial);
  const jobs = area ? all.filter((j) => j.department === area) : all;
  if (!jobs.length) {
    return (
      <div className="panel empty">
        <span className="empty__icon">
          <Users aria-hidden />
        </span>
        <strong>Nenhuma vaga aberta {area ? "nesta área" : "no momento"}</strong>
        <p>Novas oportunidades são publicadas aqui e no LinkedIn da AMS.</p>
        <a href={SITE.social.linkedin} className="btn btn--outline" target="_blank" rel="noopener" style={{ marginTop: 10 }}>
          <LinkedinIcon width={16} height={16} aria-hidden /> Seguir no LinkedIn
        </a>
      </div>
    );
  }
  return (
    <div className="job-list" key={area}>
      {jobs.map((j, i) => (
        <article key={j.id} className="job job--in" style={{ animationDelay: `${i * 50}ms` }}>
          <div>
            <h3>
              <Link href={`/trabalhe-conosco/${j.slug}`}>{j.title}</Link>
            </h3>
            <p className="small muted" style={{ marginTop: 4 }}>
              {j.summary}
            </p>
            <div className="job__meta">
              <span>
                <Building2 aria-hidden /> {j.department}
              </span>
              <span>
                <MapPin aria-hidden /> {j.location}
              </span>
              <span>
                <Briefcase aria-hidden /> {EMPLOYMENT_LABEL[j.employmentType]}
              </span>
              <span>
                <Users aria-hidden /> {j.openings} {j.openings === 1 ? "vaga" : "vagas"}
              </span>
              <span className="subtle">Publicada {relative(j.publishedAt)}</span>
            </div>
          </div>
          <span className="job__go" aria-hidden>
            <ArrowUpRight />
          </span>
        </article>
      ))}
    </div>
  );
}

const useArea = () => useSearchParams().get("area") ?? "";

/** Filtro de área lido de ?area= no navegador. */
export function JobFiltersFromUrl({ initial }: { initial: PublicVacancy[] }) {
  return <JobFilters initial={initial} area={useArea()} />;
}

export function JobListFromUrl({ initial }: { initial: PublicVacancy[] }) {
  return <JobList initial={initial} area={useArea()} />;
}
