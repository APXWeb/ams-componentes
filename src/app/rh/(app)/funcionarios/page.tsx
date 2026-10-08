import type { Metadata } from "next";
import { FuncionariosView } from "./view";

export const metadata: Metadata = { title: "Funcionários" };

export default function FuncionariosPage() {
  return <FuncionariosView />;
}
