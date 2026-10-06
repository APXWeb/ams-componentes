import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/rh/ui";
import { EmployeeForm } from "@/components/rh/employee-form";
import { activeEmployeeOptions, positionOptions } from "@/lib/rh-options";
import { createEmployee } from "../actions";

export const metadata: Metadata = { title: "Novo funcionário" };

export default async function NovoFuncionarioPage() {
  await requireUser("employees.manage");
  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader back={{ href: "/rh/funcionarios", label: "Funcionários" }} title="Novo funcionário" description="Candidatos aprovados no recrutamento podem ser contratados direto pelo quadro, sem redigitar os dados." />
      <EmployeeForm action={createEmployee} positions={positionOptions()} managers={activeEmployeeOptions()} cancelHref="/rh/funcionarios" />
    </div>
  );
}
