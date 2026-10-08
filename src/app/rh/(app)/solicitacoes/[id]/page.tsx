import type { Metadata } from "next";
import { seedToday, staticIds } from "@/lib/demo/public";
import { SolicitacaoView } from "./view";

export const generateStaticParams = () => staticIds("requests");

export async function generateMetadata({ params }: PageProps<"/rh/solicitacoes/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  const d = seedToday();
  const row = d.requests.find((x) => x.id === id);
  return { title: row ? `${row.subject}` : "Solicitação" };
}

export default async function Page({ params }: PageProps<"/rh/solicitacoes/[id]">) {
  return <SolicitacaoView id={Number((await params).id)} />;
}
