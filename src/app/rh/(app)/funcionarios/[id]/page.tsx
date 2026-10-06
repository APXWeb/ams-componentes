import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { canSeeEmployee, requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { EmployeeProfile } from "@/components/rh/employee-profile";
import { SavedToast } from "@/components/rh/saved-toast";

export async function generateMetadata({ params }: PageProps<"/rh/funcionarios/[id]">): Promise<Metadata> {
  const e = db.select({ name: schema.employees.name }).from(schema.employees).where(eq(schema.employees.id, Number((await params).id))).get();
  return { title: e?.name ?? "Funcionário" };
}

export default async function FuncionarioPage({ params, searchParams }: PageProps<"/rh/funcionarios/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const emp = Number.isInteger(id) ? db.select().from(schema.employees).where(eq(schema.employees.id, id)).get() : undefined;
  // fora do escopo do usuário, a página simplesmente não existe para ele
  if (!emp || !canSeeEmployee(user, emp)) notFound();
  const sp = await searchParams;
  return (
    <>
      <SavedToast flags={{ criado: "Funcionário cadastrado.", salvo: "Alterações salvas.", contratado: "Contratação concluída: cadastro criado e documentos admissionais pedidos." }} />
      <EmployeeProfile user={user} employeeId={id} tab={typeof sp.aba === "string" ? sp.aba : undefined} basePath={`/rh/funcionarios/${id}`} self={user.employeeId === id} />
    </>
  );
}
