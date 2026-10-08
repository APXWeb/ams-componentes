"use client";

import { PageHeader } from "@/components/rh/ui";
import { EmployeeForm } from "@/components/rh/employee-form";
import { Guard, useRh } from "@/components/rh/demo-app";
import { activeEmployeeOptions, positionOptions } from "@/lib/demo/queries";
import { createEmployee } from "@/lib/demo/actions/employees";
import { todayISO } from "@/lib/format";

export function NovoFuncionarioView() {
  return (
    <Guard anyOf={["employees.manage"]}>
      <Novo />
    </Guard>
  );
}

function Novo() {
  const { d } = useRh();
  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader back={{ href: "/rh/funcionarios", label: "Funcionários" }} title="Novo funcionário" description="Candidatos aprovados no recrutamento podem ser contratados direto pelo quadro, sem redigitar os dados." />
      <EmployeeForm action={createEmployee} positions={positionOptions(d)} managers={activeEmployeeOptions(d)} initial={{ hiredAt: todayISO(), city: "Cotia" }} cancelHref="/rh/funcionarios" />
    </div>
  );
}
