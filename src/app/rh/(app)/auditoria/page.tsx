import type { Metadata } from "next";
import { AuditoriaView } from "./view";

export const metadata: Metadata = { title: "Auditoria" };

export default function AuditoriaPage() {
  return <AuditoriaView />;
}
