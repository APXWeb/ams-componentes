import type { Metadata } from "next";
import { MensagensView } from "./view";

export const metadata: Metadata = { title: "Mensagens do site" };

export default function MensagensPage() {
  return <MensagensView />;
}
