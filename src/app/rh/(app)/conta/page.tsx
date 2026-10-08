import type { Metadata } from "next";
import { ContaView } from "./view";

export const metadata: Metadata = { title: "Minha conta" };

export default function ContaPage() {
  return <ContaView />;
}
