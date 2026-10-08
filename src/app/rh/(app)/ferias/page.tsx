import type { Metadata } from "next";
import { FeriasView } from "./view";

export const metadata: Metadata = { title: "Férias" };

export default function FeriasPage() {
  return <FeriasView />;
}
