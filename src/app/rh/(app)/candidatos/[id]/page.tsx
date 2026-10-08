import type { Metadata } from "next";
import { seedToday, staticIds } from "@/lib/demo/public";
import { CandidatoView } from "./view";

export const generateStaticParams = () => staticIds("applications");

export async function generateMetadata({ params }: PageProps<"/rh/candidatos/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  const d = seedToday();
  const app = d.applications.find((x) => x.id === id);
  const name = app ? d.candidates.find((c) => c.id === app.candidateId)?.name : undefined;
  return { title: name ? `${name} · Candidato` : "Candidato" };
}

export default async function Page({ params }: PageProps<"/rh/candidatos/[id]">) {
  return <CandidatoView id={Number((await params).id)} />;
}
