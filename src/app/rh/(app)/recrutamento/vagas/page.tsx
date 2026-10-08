import type { Metadata } from "next";
import { VagasView } from "./view";

export const metadata: Metadata = { title: "Vagas" };

export default function VagasPage() {
  return <VagasView />;
}
