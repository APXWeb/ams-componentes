import type { Metadata } from "next";
import { NovaVagaView } from "./view";

export const metadata: Metadata = { title: "Nova vaga" };

export default function NovaVagaPage() {
  return <NovaVagaView />;
}
