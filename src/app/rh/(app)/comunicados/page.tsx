import type { Metadata } from "next";
import { ComunicadosView } from "./view";

export const metadata: Metadata = { title: "Comunicados" };

export default function ComunicadosPage() {
  return <ComunicadosView />;
}
