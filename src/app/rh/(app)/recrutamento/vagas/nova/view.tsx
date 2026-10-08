"use client";

import { PageHeader } from "@/components/rh/ui";
import { VacancyForm } from "@/components/rh/vacancy-form";
import { Guard, useRh } from "@/components/rh/demo-app";
import { departmentOptions } from "@/lib/demo/queries";

export function NovaVagaView() {
  return (
    <Guard anyOf={["recruitment.manage"]}>
      <Nova />
    </Guard>
  );
}

function Nova() {
  const { d } = useRh();
  return (
    <>
      <PageHeader back={{ href: "/rh/recrutamento/vagas", label: "Vagas" }} title="Nova vaga" description="Ao publicar, a vaga aparece em Trabalhe Conosco e passa a receber candidaturas." />
      <VacancyForm departments={departmentOptions(d)} positions={d.positions} />
    </>
  );
}
