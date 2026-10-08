import type { Metadata } from "next";
import { seedToday, staticIds } from "@/lib/demo/public";
import { EditarVagaView } from "./view";

export const generateStaticParams = () => staticIds("vacancies");

export async function generateMetadata({ params }: PageProps<"/rh/recrutamento/vagas/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  const d = seedToday();
  const row = d.vacancies.find((x) => x.id === id);
  return { title: row ? `Editar: ${row.title}` : "Editar vaga" };
}

export default async function Page({ params }: PageProps<"/rh/recrutamento/vagas/[id]">) {
  return <EditarVagaView id={Number((await params).id)} />;
}
