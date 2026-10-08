import type { Metadata } from "next";
import { IndicadoresView } from "./view";

export const metadata: Metadata = { title: "Indicadores" };

export default function IndicadoresPage() {
  return <IndicadoresView />;
}
