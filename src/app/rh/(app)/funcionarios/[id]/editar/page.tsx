import type { Metadata } from "next";
import { seedToday, staticIds } from "@/lib/demo/public";
import { EditarFuncionarioView } from "./view";

export const generateStaticParams = () => staticIds("employees");

export async function generateMetadata({ params }: PageProps<"/rh/funcionarios/[id]/editar">): Promise<Metadata> {
  const id = Number((await params).id);
  const d = seedToday();
  const row = d.employees.find((x) => x.id === id);
  return { title: row ? `Editar: ${row.name}` : "Editar funcionário" };
}

export default async function Page({ params }: PageProps<"/rh/funcionarios/[id]/editar">) {
  return <EditarFuncionarioView id={Number((await params).id)} />;
}
