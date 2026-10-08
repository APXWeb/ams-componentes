import type { Metadata } from "next";
import { SolicitacoesView } from "./view";

export const metadata: Metadata = { title: "Solicitações" };

export default function SolicitacoesPage() {
  return <SolicitacoesView />;
}
