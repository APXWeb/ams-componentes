"use client";

import { useSearchParams } from "next/navigation";
import { EmployeeProfile } from "@/components/rh/employee-profile";
import { NotFoundState, useRh } from "@/components/rh/demo-app";
import { canSeeEmployee, employee } from "@/lib/demo/queries";

export function FuncionarioView({ id }: { id: number }) {
  const { d, user } = useRh();
  const tab = useSearchParams().get("aba");
  const emp = employee(d, id);
  // fora do escopo do perfil, o cadastro simplesmente não existe para ele
  if (!emp || !canSeeEmployee(user, emp)) return <NotFoundState what="Funcionário" />;
  return <EmployeeProfile d={d} user={user} employeeId={id} tab={tab} basePath={`/rh/funcionarios/${id}`} self={user.employeeId === id} />;
}
