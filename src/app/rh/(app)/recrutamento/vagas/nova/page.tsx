import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/rh/ui";
import { VacancyForm } from "@/components/rh/vacancy-form";
import { departmentOptions } from "@/lib/rh-options";

export const metadata: Metadata = { title: "Nova vaga" };

export default async function NovaVagaPage() {
  await requireUser("recruitment.manage");
  const positions = db.select({ id: schema.positions.id, title: schema.positions.title, departmentId: schema.positions.departmentId }).from(schema.positions).all();
  return (
    <>
      <PageHeader back={{ href: "/rh/recrutamento/vagas", label: "Vagas" }} title="Nova vaga" description="Ao publicar, a vaga aparece em Trabalhe Conosco e passa a receber candidaturas." />
      <VacancyForm departments={departmentOptions()} positions={positions} />
    </>
  );
}
