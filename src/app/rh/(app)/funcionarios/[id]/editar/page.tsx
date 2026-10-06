import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/rh/ui";
import { EmployeeForm } from "@/components/rh/employee-form";
import { activeEmployeeOptions, positionOptions } from "@/lib/rh-options";
import { updateEmployee } from "../../actions";

export const metadata: Metadata = { title: "Editar funcionário" };

export default async function EditarFuncionarioPage({ params }: PageProps<"/rh/funcionarios/[id]/editar">) {
  await requireUser("employees.manage");
  const id = Number((await params).id);
  const e = db.select().from(schema.employees).where(eq(schema.employees.id, id)).get();
  if (!e) notFound();
  if (e.status === "DESLIGADO") redirect(`/rh/funcionarios/${id}`);
  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader back={{ href: `/rh/funcionarios/${id}`, label: e.name }} title="Editar cadastro" description="Mudanças de cargo, departamento, gestor e situação ficam registradas no histórico." />
      <EmployeeForm
        action={updateEmployee}
        positions={positionOptions()}
        managers={activeEmployeeOptions().filter((m) => m.value !== id)}
        initial={e}
        cancelHref={`/rh/funcionarios/${id}`}
      />
    </div>
  );
}
