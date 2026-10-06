import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { EmployeeProfile } from "@/components/rh/employee-profile";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PerfilPage({ searchParams }: PageProps<"/rh/perfil">) {
  const user = await requireUser();
  if (!user.employeeId) redirect("/rh");
  const sp = await searchParams;
  return (
    <>
      <EmployeeProfile user={user} employeeId={user.employeeId} tab={typeof sp.aba === "string" ? sp.aba : undefined} basePath="/rh/perfil" self />
      <p className="xsmall subtle" style={{ marginTop: 16 }}>
        Algum dado está errado? Abra uma solicitação de atualização cadastral para o RH.
      </p>
    </>
  );
}
