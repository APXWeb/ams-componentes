import type { Metadata } from "next";
import { NovoFuncionarioView } from "./view";

export const metadata: Metadata = { title: "Novo funcionário" };

export default function NovoFuncionarioPage() {
  return <NovoFuncionarioView />;
}
