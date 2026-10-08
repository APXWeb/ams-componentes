"use client";

import { PageHeader } from "@/components/rh/ui";
import { VacancyForm } from "@/components/rh/vacancy-form";
import { Badge } from "@/components/ui/bits";
import { Guard, NotFoundState, useRh } from "@/components/rh/demo-app";
import { departmentOptions } from "@/lib/demo/queries";
import { VACANCY_STATUS_LABEL } from "@/lib/labels";

export function EditarVagaView({ id }: { id: number }) {
  return (
    <Guard anyOf={["recruitment.manage"]}>
      <Editar id={id} />
    </Guard>
  );
}

function Editar({ id }: { id: number }) {
  const { d } = useRh();
  const v = d.vacancies.find((x) => x.id === id);
  if (!v) return <NotFoundState what="Vaga" />;
  return (
    <>
      <PageHeader
        back={{ href: "/rh/recrutamento/vagas", label: "Vagas" }}
        title={
          <>
            {v.title} <Badge status={v.status}>{VACANCY_STATUS_LABEL[v.status]}</Badge>
          </>
        }
        description="Alterações em vagas publicadas aparecem no site imediatamente."
      />
      <VacancyForm key={v.updatedAt} initial={v} departments={departmentOptions(d)} positions={d.positions} />
    </>
  );
}
