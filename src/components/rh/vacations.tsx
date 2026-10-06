import Link from "next/link";
import { Check, Palmtree, X, Ban } from "lucide-react";
import { ActionModal } from "@/components/ui/modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form";
import { Badge, Empty } from "@/components/ui/bits";
import { VACATION_STATUS_LABEL } from "@/lib/labels";
import { fmtDate, relative, todayISO } from "@/lib/format";
import { cancelVacation, requestVacation, reviewVacation } from "@/app/rh/(app)/ferias/actions";

export type VacationRow = {
  id: number;
  employeeId: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "PENDENTE" | "APROVADO" | "RECUSADO" | "CANCELADO";
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
  department?: string;
};

export function VacationTable({
  rows,
  showEmployee = true,
  review,
  cancelOwnFor,
  hrCancel,
}: {
  rows: VacationRow[];
  showEmployee?: boolean;
  review?: boolean;
  cancelOwnFor?: number | null;
  hrCancel?: boolean;
}) {
  if (!rows.length) return <Empty icon={Palmtree} title="Nenhum período de férias" />;
  const today = todayISO();
  return (
    <div className="table-wrap">
      <table className="table table--stack">
        <thead>
          <tr>
            {showEmployee ? <th scope="col">Funcionário</th> : null}
            <th scope="col">Período</th>
            <th scope="col" className="num">
              Dias
            </th>
            <th scope="col">Situação</th>
            <th scope="col">Observação</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ongoing = r.status === "APROVADO" && r.startDate <= today && r.endDate >= today;
            const canCancel = (hrCancel && (r.status === "PENDENTE" || (r.status === "APROVADO" && r.startDate > today))) || (cancelOwnFor === r.employeeId && r.status === "PENDENTE");
            return (
              <tr key={r.id}>
                {showEmployee ? (
                  <td className="cell-main">
                    <Link className="row-link" href={`/rh/funcionarios/${r.employeeId}?aba=ferias`} style={{ position: "static" }}>
                      {r.employeeName}
                    </Link>
                    {r.department ? <small className="subtle" style={{ display: "block" }}>{r.department}</small> : null}
                  </td>
                ) : null}
                <td data-label="Período" className={showEmployee ? "" : "cell-main"}>
                  <span className="tabular nowrap">
                    {fmtDate(r.startDate)} a {fmtDate(r.endDate)}
                  </span>
                  {r.status === "PENDENTE" ? <small className="subtle" style={{ display: "block" }}>Pedido {relative(r.createdAt)}</small> : null}
                </td>
                <td data-label="Dias" className="num">
                  {r.days}
                </td>
                <td data-label="Situação">
                  {ongoing ? <Badge tone="brand">Em férias</Badge> : <Badge status={r.status}>{VACATION_STATUS_LABEL[r.status]}</Badge>}
                </td>
                <td data-label="Observação" className="small muted" style={{ maxWidth: 280 }}>
                  {r.reviewNote ?? r.note ?? "—"}
                </td>
                <td>
                  <div className="row" style={{ "--gap": "4px", justifyContent: "flex-end" } as React.CSSProperties}>
                    {review && r.status === "PENDENTE" ? (
                      <>
                        <ActionModal
                          trigger={
                            <>
                              <Check aria-hidden /> Aprovar
                            </>
                          }
                          triggerClass="btn btn--sm"
                          title="Aprovar férias"
                          description={`${r.employeeName}: ${fmtDate(r.startDate)} a ${fmtDate(r.endDate)} (${r.days} dias). O saldo será descontado.`}
                          action={reviewVacation}
                          submitLabel="Aprovar"
                          hidden={{ id: r.id, decision: "APROVADO" }}
                        >
                          <TextAreaField label="Mensagem ao funcionário" name="note" optional rows={2} />
                        </ActionModal>
                        <ActionModal
                          trigger={<X aria-hidden />}
                          triggerClass="btn btn--danger-outline btn--sm btn--icon"
                          title="Recusar férias"
                          description={`${r.employeeName}: ${fmtDate(r.startDate)} a ${fmtDate(r.endDate)}.`}
                          action={reviewVacation}
                          submitLabel="Recusar pedido"
                          submitClass="btn btn--danger"
                          hidden={{ id: r.id, decision: "RECUSADO" }}
                        >
                          <TextAreaField label="Motivo" name="note" rows={3} placeholder="Ex.: período coincide com o inventário. Sugerimos a semana seguinte." />
                        </ActionModal>
                      </>
                    ) : null}
                    {canCancel ? (
                      <ActionModal
                        trigger={<Ban aria-hidden />}
                        triggerClass="btn btn--ghost btn--sm btn--icon"
                        title="Cancelar férias"
                        description={`Cancelar o período de ${fmtDate(r.startDate)} a ${fmtDate(r.endDate)}?${r.status === "APROVADO" ? " Os dias voltam para o saldo." : ""}`}
                        action={cancelVacation}
                        submitLabel="Cancelar férias"
                        submitClass="btn btn--danger"
                        hidden={{ id: r.id }}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function VacationRequestButton({ employees, balance, open }: { employees?: { value: number; label: string }[]; balance?: number; open?: boolean }) {
  const hr = !!employees;
  return (
    <ActionModal
      trigger={
        <>
          <Palmtree aria-hidden /> {hr ? "Registrar férias" : "Solicitar férias"}
        </>
      }
      triggerClass="btn"
      title={hr ? "Registrar férias" : "Solicitar férias"}
      description={hr ? "Registre um pedido em nome do funcionário ou lance férias já aprovadas." : `Saldo disponível: ${balance ?? 0} dias. Períodos de 5 a 30 dias.`}
      action={requestVacation}
      submitLabel={hr ? "Registrar" : "Enviar pedido"}
      autoOpen={open}
    >
      {hr ? <SelectField label="Funcionário" name="employeeId" placeholder="Selecione" options={employees!} defaultValue="" /> : null}
      <div className="grid grid-2">
        <TextField label="Início" name="startDate" type="date" min={hr ? undefined : todayISO()} />
        <TextField label="Término" name="endDate" type="date" min={hr ? undefined : todayISO()} />
      </div>
      <TextAreaField label="Observação" name="note" optional rows={2} />
      {hr ? (
        <label className="check">
          <input type="checkbox" name="approveNow" defaultChecked /> Já aprovar e descontar do saldo
        </label>
      ) : null}
    </ActionModal>
  );
}
