"use client";

import Link from "next/link";
import { useState } from "react";
import { Save, Send } from "lucide-react";
import { FormErrorsContext, PendingContext, SelectField, SubmitButton, TextAreaField, TextField, useFormAction } from "@/components/ui/form";
import { saveVacancy } from "@/app/rh/(app)/recrutamento/actions";

type V = {
  id?: number;
  title?: string;
  departmentId?: number;
  positionId?: number | null;
  location?: string;
  employmentType?: string;
  openings?: number;
  summary?: string;
  description?: string;
  requirements?: string;
  additionalInfo?: string | null;
  status?: string;
};

export function VacancyForm({
  initial = {},
  departments,
  positions,
}: {
  initial?: V;
  departments: { value: number; label: string }[];
  positions: { id: number; title: string; departmentId: number }[];
}) {
  const { state, onSubmit, pending } = useFormAction(saveVacancy);
  const [dept, setDept] = useState<number>(initial.departmentId ?? 0);
  const [summary, setSummary] = useState(initial.summary ?? "");
  const published = initial.status === "ABERTA";

  return (
    <PendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} noValidate className="grid grid-main">
        <FormErrorsContext.Provider value={state.fieldErrors ?? {}}>
          {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
          <div className="stack" style={{ "--gap": "16px" } as React.CSSProperties}>
            {state.message && !state.ok ? (
              <div className="notice notice--danger" role="alert">
                {state.message}
              </div>
            ) : null}
            <section className="panel">
              <header className="panel__head">
                <h2 className="panel__title">Conteúdo publicado no site</h2>
              </header>
              <div className="panel__body stack" style={{ "--gap": "16px" } as React.CSSProperties}>
                <TextField label="Cargo da vaga" name="title" defaultValue={initial.title} placeholder="Ex.: Operador de Máquinas" />
                <div className="field">
                  <TextField
                    label="Resumo"
                    name="summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    maxLength={200}
                    hint="Uma frase que aparece na lista de vagas."
                  />
                  <span className="xsmall subtle" style={{ textAlign: "right" }} aria-live="polite">
                    {summary.length}/200
                  </span>
                </div>
                <TextAreaField label="Atividades" name="description" rows={6} defaultValue={initial.description} hint="Uma atividade por linha. Cada linha vira um item na página da vaga." />
                <TextAreaField label="Requisitos" name="requirements" rows={5} defaultValue={initial.requirements} hint="Um requisito por linha." />
                <TextAreaField label="Informações adicionais" name="additionalInfo" rows={3} optional defaultValue={initial.additionalInfo ?? ""} hint="Diferenciais, jornada, observações. Só publique benefícios confirmados." />
              </div>
            </section>
          </div>
          <div className="stack" style={{ "--gap": "16px", alignContent: "start" } as React.CSSProperties}>
            <section className="panel">
              <header className="panel__head">
                <h2 className="panel__title">Detalhes</h2>
              </header>
              <div className="panel__body stack" style={{ "--gap": "16px" } as React.CSSProperties}>
                <SelectField label="Departamento" name="departmentId" placeholder="Selecione" options={departments} value={dept || ""} onChange={(e) => setDept(Number(e.target.value))} />
                <SelectField
                  label="Cargo no quadro"
                  name="positionId"
                  optional
                  placeholder={dept ? "Sem vínculo" : "Escolha o departamento"}
                  options={positions.filter((p) => p.departmentId === dept).map((p) => ({ value: p.id, label: p.title }))}
                  defaultValue={initial.positionId ?? ""}
                  hint="Usado para preencher a contratação."
                  key={dept}
                />
                <TextField label="Localização" name="location" defaultValue={initial.location ?? "Cotia, SP"} />
                <div className="grid grid-2">
                  <SelectField
                    label="Contratação"
                    name="employmentType"
                    defaultValue={initial.employmentType ?? "CLT"}
                    options={[
                      { value: "CLT", label: "CLT" },
                      { value: "ESTAGIO", label: "Estágio" },
                      { value: "TEMPORARIO", label: "Temporário" },
                      { value: "APRENDIZ", label: "Jovem aprendiz" },
                      { value: "PJ", label: "PJ" },
                    ]}
                  />
                  <TextField label="Posições" name="openings" type="number" min={1} max={50} defaultValue={initial.openings ?? 1} />
                </div>
              </div>
            </section>
            <div className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
              <SubmitButton className="btn btn--signal btn--lg btn--block" name="publish" value="1">
                <Send aria-hidden /> {published ? "Salvar e manter publicada" : "Salvar e publicar no site"}
              </SubmitButton>
              {!published ? (
                <SubmitButton className="btn btn--outline btn--block" name="publish" value="0">
                  <Save aria-hidden /> Salvar como rascunho
                </SubmitButton>
              ) : null}
              <Link href="/rh/recrutamento/vagas" className="btn btn--ghost btn--block">
                Cancelar
              </Link>
            </div>
          </div>
        </FormErrorsContext.Provider>
      </form>
    </PendingContext.Provider>
  );
}
