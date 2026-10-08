"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmployeeProfile } from "@/components/rh/employee-profile";
import { PageHeader } from "@/components/rh/ui";
import { useRh } from "@/components/rh/demo-app";

export function PerfilView() {
  const { d, user } = useRh();
  const tab = useSearchParams().get("aba");
  if (!user.employeeId) {
    return <PageHeader eyebrow="Meu perfil" title="Perfil sem cadastro de funcionário" description="O usuário Administrador do Sistema não está vinculado a um cadastro. Troque de perfil no menu do usuário para ver o perfil de um colaborador." />;
  }
  return (
    <>
      <EmployeeProfile d={d} user={user} employeeId={user.employeeId} tab={tab} basePath="/rh/perfil" self />
      <p className="xsmall subtle" style={{ marginTop: 16 }}>
        Algum dado está errado?{" "}
        <Link className="link" href="/rh/solicitacoes?nova=1">
          Abra uma solicitação de atualização cadastral
        </Link>{" "}
        para o RH.
      </p>
    </>
  );
}
