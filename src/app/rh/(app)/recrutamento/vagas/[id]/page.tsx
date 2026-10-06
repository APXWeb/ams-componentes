import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/rh/ui";
import { VacancyForm } from "@/components/rh/vacancy-form";
import { Badge } from "@/components/ui/bits";
import { departmentOptions } from "@/lib/rh-options";
import { VACANCY_STATUS_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Editar vaga" };

export default async function EditarVagaPage({ params }: PageProps<"/rh/recrutamento/vagas/[id]">) {
  await requireUser("recruitment.manage");
  const v = db.select().from(schema.vacancies).where(eq(schema.vacancies.id, Number((await params).id))).get();
  if (!v) notFound();
  const positions = db.select({ id: schema.positions.id, title: schema.positions.title, departmentId: schema.positions.departmentId }).from(schema.positions).all();
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
      <VacancyForm initial={v} departments={departmentOptions()} positions={positions} />
    </>
  );
}
