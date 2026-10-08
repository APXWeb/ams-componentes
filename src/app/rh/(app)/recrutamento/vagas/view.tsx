"use client";

import Link from "next/link";
import { Briefcase, ExternalLink, Plus, Pencil, Send, Archive, Undo2 } from "lucide-react";
import { can } from "@/lib/permissions";
import { asset } from "@/lib/asset";
import { PageHeader } from "@/components/rh/ui";
import { Badge, Empty } from "@/components/ui/bits";
import { ActionModal } from "@/components/ui/modal";
import { Guard, useRh } from "@/components/rh/demo-app";
import { dept, vacanciesScope } from "@/lib/demo/queries";
import { setVacancyStatus } from "@/lib/demo/actions/recruitment";
import { EMPLOYMENT_LABEL, VACANCY_STATUS_LABEL } from "@/lib/labels";
import { fmtDate } from "@/lib/format";

export function VagasView() {
  return (
    <Guard anyOf={["recruitment.view"]}>
      <Lista />
    </Guard>
  );
}

const ORDER = { ABERTA: 0, RASCUNHO: 1, ENCERRADA: 2 };

function Lista() {
  const { d, user } = useRh();
  const editable = can(user.role, "recruitment.manage");
  const rows = d.vacancies.filter(vacanciesScope(user)).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <PageHeader
        back={{ href: "/rh/recrutamento", label: "Recrutamento" }}
        title="Vagas"
        description="Vagas publicadas aparecem em Trabalhe Conosco, no site, e passam a receber candidaturas."
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
                  const total = d.applications.filter((a) => a.vacancyId === v.id).length;
                  const hired = d.applications.filter((a) => a.vacancyId === v.id && a.outcome === "CONTRATADO").length;
                  return (
                    <tr key={v.id}>
                      <td className="cell-main">
                        <Link href={`/rh/recrutamento?vaga=${v.id}`} className="row-link row-link--plain">
                          {v.title}
                        </Link>
                        <small className="subtle" style={{ display: "block" }}>
                          {dept(d, v.departmentId)?.name} · {EMPLOYMENT_LABEL[v.employmentType]} · {v.openings} {v.openings === 1 ? "posição" : "posições"}
                        </small>
                      </td>
                      <td data-label="Situação">
                        <Badge status={v.status}>{VACANCY_STATUS_LABEL[v.status]}</Badge>
                      </td>
                      <td data-label="Candidatos" className="num">
                        {total}
                      </td>
                      <td data-label="Contratados" className="num">
                        {hired}/{v.openings}
                      </td>
                      <td data-label="Publicação" className="nowrap subtle tabular">
                        {v.status === "ENCERRADA" ? `Encerrada ${fmtDate(v.closedAt)}` : v.publishedAt ? fmtDate(v.publishedAt) : "Não publicada"}
                      </td>
                      <td>
                        <div className="row" style={{ "--gap": "4px", justifyContent: "flex-end" } as React.CSSProperties}>
                          {v.status === "ABERTA" ? (
                            <a className="btn btn--ghost btn--sm btn--icon" href={`${asset("/trabalhe-conosco/")}${v.slug}`} target="_blank" rel="noopener" aria-label={`Ver ${v.title} no site`} title="Ver no site">
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
