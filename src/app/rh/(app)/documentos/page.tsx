import type { Metadata } from "next";
import { DocumentosView } from "./view";

export const metadata: Metadata = { title: "Documentos" };

export default function DocumentosPage() {
  return <DocumentosView />;
}
