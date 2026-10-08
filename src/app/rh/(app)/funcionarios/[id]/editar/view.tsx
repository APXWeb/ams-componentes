"use client";

import { PageHeader } from "@/components/rh/ui";
import { EmployeeForm } from "@/components/rh/employee-form";
import { Guard, NotFoundState, useRh } from "@/components/rh/demo-app";
import { activeEmployeeOptions, employee, positionOptions } from "@/lib/demo/queries";
import { updateEmployee } from "@/lib/demo/actions/employees";

export function EditarFuncionarioView({ id }: { id: number }) {
  return (
    <Guard anyOf={["employees.manage"]}>
      <Editar id={id} />
    </Guard>
  );
}

function Editar({ id }: { id: number }) {
  const { d } = useRh();
  const e = employee(d, id);
  if (!e) return <NotFoundState what="Funcionário" />;
  if (e.status === "DESLIGADO") {
    return (
      <div style={{ maxWidth: 920 }}>
        <PageHeader back={{ href: `/rh/funcionarios/${id}`, label: e.name }} title="Editar cadastro" />
        <div className="notice notice--warning">Funcionário desligado: o cadastro fica disponível apenas para consulta.</div>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader back={{ href: `/rh/funcionarios/${id}`, label: e.name }} title="Editar cadastro" description="Mudanças de cargo, departamento, gestor e situação ficam registradas no histórico." />
      <EmployeeForm action={updateEmployee} positions={positionOptions(d)} managers={activeEmployeeOptions(d).filter((m) => m.value !== id)} initial={e} cancelHref={`/rh/funcionarios/${id}`} />
    </div>
  );
}
