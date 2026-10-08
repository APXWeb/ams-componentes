import type { Metadata } from "next";
import { seedToday, staticIds } from "@/lib/demo/public";
import { FuncionarioView } from "./view";

export const generateStaticParams = () => staticIds("employees");

export async function generateMetadata({ params }: PageProps<"/rh/funcionarios/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  const d = seedToday();
  const row = d.employees.find((x) => x.id === id);
  return { title: row ? `${row.name}` : "Funcionário" };
}

export default async function Page({ params }: PageProps<"/rh/funcionarios/[id]">) {
  return <FuncionarioView id={Number((await params).id)} />;
}
