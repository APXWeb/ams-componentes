import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { Briefcase, ExternalLink, Plus, Pencil, Send, Archive, Undo2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, schema } from "@/db";
import { vacanciesScope } from "@/lib/rh-scope";
import { PageHeader } from "@/components/rh/ui";
import { Badge, Empty } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { SavedToast } from "@/components/rh/saved-toast";
import { EMPLOYMENT_LABEL, VACANCY_STATUS_LABEL } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { setVacancyStatus } from "../actions";

export const metadata: Metadata = { title: "Vagas" };

export default async function VagasPage() {
  const user = await requireUser("recruitment.view");
  const editable = can(user.role, "recruitment.manage");
  const rows = db
    .select({
      id: schema.vacancies.id,
      title: schema.vacancies.title,
      slug: schema.vacancies.slug,
      status: schema.vacancies.status,
      type: schema.vacancies.employmentType,
      openings: schema.vacancies.openings,
      publishedAt: schema.vacancies.publishedAt,
      closedAt: schema.vacancies.closedAt,
      createdAt: schema.vacancies.createdAt,
      department: schema.departments.name,
      total: count(schema.applications.id),
    })
    .from(schema.vacancies)
    .innerJoin(schema.departments, eq(schema.departments.id, schema.vacancies.departmentId))
    .leftJoin(schema.applications, eq(schema.applications.vacancyId, schema.vacancies.id))
    .where(and(vacanciesScope(user)))
    .groupBy(schema.vacancies.id)
    .orderBy(desc(schema.vacancies.updatedAt))
    .all();
  const hired = db
    .select({ v: schema.applications.vacancyId, n: count() })
    .from(schema.applications)
    .where(eq(schema.applications.outcome, "CONTRATADO"))
    .groupBy(schema.applications.vacancyId)
    .all();
  const order = { ABERTA: 0, RASCUNHO: 1, ENCERRADA: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status]);

  return (
    <>
      <SavedToast flags={{ publicada: "Vaga publicada no site.", salva: "Vaga salva." }} />
      <PageHeader
        back={{ href: "/rh/recrutamento", label: "Recrutamento" }}
        title="Vagas"
        description="Vagas publicadas aparecem imediatamente em Trabalhe Conosco no site."
        actions={
          editable ? (
            <Link href="/rh/recrutamento/vagas/nova" className="btn">
              <Plus aria-hidden /> Nova vaga
            </Link>
          ) : null
        }
      />
      <section className="panel">
        {rows.length ? (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">Vaga</th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="num">
                    Candidatos
                  </th>
                  <th scope="col" className="num">
                    Contratados
                  </th>
                  <th scope="col">Publicação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const h = hired.find((x) => x.v === v.id)?.n ?? 0;
                  return (
                    <tr key={v.id}>
                      <td className="cell-main">
                        <Link href={`/rh/recrutamento?vaga=${v.id}`} className="row-link" style={{ position: "static" }}>
                          {v.title}
                        </Link>
                        <small className="subtle" style={{ display: "block" }}>
                          {v.department} · {EMPLOYMENT_LABEL[v.type]} · {v.openings} {v.openings === 1 ? "posição" : "posições"}
                        </small>
                      </td>
                      <td data-label="Situação">
                        <Badge status={v.status}>{VACANCY_STATUS_LABEL[v.status]}</Badge>
                      </td>
                      <td data-label="Candidatos" className="num">
                        {v.total}
                      </td>
                      <td data-label="Contratados" className="num">
                        {h}/{v.openings}
                      </td>
                      <td data-label="Publicação" className="nowrap subtle tabular">
                        {v.status === "ENCERRADA" ? `Encerrada ${fmtDate(v.closedAt)}` : v.publishedAt ? fmtDate(v.publishedAt) : "Não publicada"}
                      </td>
                      <td>
                        <div className="row" style={{ "--gap": "4px", justifyContent: "flex-end" } as React.CSSProperties}>
                          {v.status === "ABERTA" ? (
                            <a className="btn btn--ghost btn--sm btn--icon" href={`/trabalhe-conosco/${v.slug}`} target="_blank" rel="noopener" aria-label={`Ver ${v.title} no site`} title="Ver no site">
                              <ExternalLink aria-hidden />
                            </a>
                          ) : null}
                          {editable ? (
                            <>
                              <Link className="btn btn--ghost btn--sm btn--icon" href={`/rh/recrutamento/vagas/${v.id}`} aria-label={`Editar ${v.title}`} title="Editar">
                                <Pencil aria-hidden />
                              </Link>
                              {v.status !== "ABERTA" ? (
                                <ActionModal
                                  trigger={
                                    <>
                                      {v.status === "ENCERRADA" ? <Undo2 aria-hidden /> : <Send aria-hidden />} {v.status === "ENCERRADA" ? "Reabrir" : "Publicar"}
                                    </>
                                  }
                                  triggerClass="btn btn--sm"
                                  title={v.status === "ENCERRADA" ? "Reabrir vaga" : "Publicar vaga"}
                                  description={`"${v.title}" passa a aparecer em Trabalhe Conosco e a receber candidaturas.`}
                                  action={setVacancyStatus}
                                  submitLabel="Publicar no site"
                                  hidden={{ id: v.id, status: "ABERTA" }}
                                />
                              ) : (
                                <ActionModal
                                  trigger={
                                    <>
                                      <Archive aria-hidden /> Encerrar
                                    </>
                                  }
                                  triggerClass="btn btn--outline btn--sm"
                                  title="Encerrar vaga"
                                  description={`"${v.title}" sai do site e deixa de receber candidaturas. Os candidatos continuam no histórico.`}
                                  action={setVacancyStatus}
                                  submitLabel="Encerrar vaga"
                                  submitClass="btn btn--danger"
                                  hidden={{ id: v.id, status: "ENCERRADA" }}
                                />
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Briefcase} title="Nenhuma vaga cadastrada" action={editable ? <Link href="/rh/recrutamento/vagas/nova" className="btn">Criar a primeira vaga</Link> : undefined} />
        )}
      </section>
    </>
  );
}
