import type { Metadata } from "next";
import { getOpenVacancies, seedToday } from "@/lib/demo/public";
import { VacancyDetail } from "@/components/site/vacancy-detail";

// todas as vagas da demo ganham página (inclusive rascunho e encerrada, que o RH pode publicar)
export const generateStaticParams = () => seedToday().vacancies.map((v) => ({ slug: v.slug }));

export async function generateMetadata({ params }: PageProps<"/trabalhe-conosco/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = getOpenVacancies().find((x) => x.slug === slug);
  if (!v) return { title: "Vaga · Trabalhe conosco" };
  return {
    title: `${v.title} · Trabalhe conosco`,
    description: `${v.title} na AMS Componentes (${v.location}). ${v.summary}`,
    alternates: { canonical: `/trabalhe-conosco/${v.slug}` },
  };
}

export default async function VagaPage({ params }: PageProps<"/trabalhe-conosco/[slug]">) {
  return <VacancyDetail slug={(await params).slug} initial={getOpenVacancies()} />;
}
