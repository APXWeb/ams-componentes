import type { Metadata } from "next";
import { RecrutamentoView } from "./view";

export const metadata: Metadata = { title: "Recrutamento" };

export default function RecrutamentoPage() {
  return <RecrutamentoView />;
}
