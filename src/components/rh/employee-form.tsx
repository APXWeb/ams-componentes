"use client";

import Link from "next/link";
import { Save } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { Field, FormErrorsContext, PendingContext, SelectField, SubmitButton, TextField, fieldA11y, useFormAction } from "@/components/ui/form";

type Opt = { value: number; label: string };
export type EmployeeFormData = {
  id?: number;
  name?: string;
  positionId?: number;
  managerId?: number | null;
  corporateEmail?: string;
  personalEmail?: string | null;
  phone?: string | null;
  city?: string | null;
  hiredAt?: string;
  employmentType?: string;
  status?: string;
  vacationBalance?: number;
};

export function EmployeeForm({
  action,
  positions,
  managers,
  initial = {},
  cancelHref,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  positions: { department: string; items: Opt[] }[];
  managers: Opt[];
  initial?: EmployeeFormData;
  cancelHref: string;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const errors = state.fieldErrors ?? {};
  const editing = !!initial.id;

  return (
    <PendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} noValidate className="stack" style={{ "--gap": "16px" } as React.CSSProperties}>
        <FormErrorsContext.Provider value={errors}>
          {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
          {state.message && !state.ok ? (
            <div className="notice notice--danger" role="alert">
              {state.message}
            </div>
          ) : null}

          <section className="panel">
            <header className="panel__head">
              <h2 className="panel__title">Dados pessoais e contato</h2>
            </header>
            <div className="panel__body grid grid-2">
              <TextField label="Nome completo" name="name" defaultValue={initial.name} autoComplete="off" className="full" />
              <TextField label="Cidade" name="city" defaultValue={initial.city ?? ""} optional />
              <TextField label="E-mail corporativo" name="corporateEmail" type="email" defaultValue={initial.corporateEmail} hint="Usado também para o login, se a pessoa tiver acesso ao sistema." />
              <TextField label="E-mail pessoal" name="personalEmail" type="email" defaultValue={initial.personalEmail ?? ""} optional />
              <TextField label="Telefone" name="phone" type="tel" defaultValue={initial.phone ?? ""} optional placeholder="(11) 90000-0000" />
            </div>
          </section>

          <section className="panel">
            <header className="panel__head">
              <h2 className="panel__title">Contrato e posição</h2>
            </header>
            <div className="panel__body grid grid-2">
              <Field label="Cargo" name="positionId" error={errors.positionId} hint="O departamento é definido pelo cargo.">
                <select className="select" defaultValue={initial.positionId ?? ""} {...fieldA11y("positionId", errors.positionId)}>
                  <option value="">Selecione</option>
                  {positions.map((g) => (
                    <optgroup key={g.department} label={g.department}>
                      {g.items.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <SelectField label="Gestor direto" name="managerId" optional placeholder="Sem gestor definido" options={managers} defaultValue={initial.managerId ?? ""} />
              <TextField label="Data de admissão" name="hiredAt" type="date" defaultValue={initial.hiredAt} />
              <SelectField
                label="Tipo de contratação"
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
              <TextField label="Saldo de férias (dias)" name="vacationBalance" type="number" min={0} max={60} defaultValue={initial.vacationBalance ?? 30} />
              {editing ? (
                <SelectField
                  label="Situação"
                  name="status"
                  defaultValue={initial.status}
                  options={[
                    { value: "ATIVO", label: "Ativo" },
                    { value: "AFASTADO", label: "Afastado" },
                  ]}
                  hint="Para desligar, use a ação Desligar no perfil."
                />
              ) : null}
            </div>
          </section>

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href={cancelHref} className="btn btn--outline">
              Cancelar
            </Link>
            <SubmitButton className="btn">
              <Save aria-hidden /> {editing ? "Salvar alterações" : "Cadastrar funcionário"}
            </SubmitButton>
          </div>
        </FormErrorsContext.Provider>
      </form>
    </PendingContext.Provider>
  );
}
