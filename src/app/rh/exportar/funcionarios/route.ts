import { alias } from "drizzle-orm/sqlite-core";
import { and, asc, eq, like, or, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { EMPLOYEE_STATUS_LABEL, EMPLOYMENT_LABEL } from "@/lib/labels";

/** Exportação CSV (Excel pt-BR) da lista filtrada de funcionários. Restrita ao RH e auditada (LGPD). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "employees.manage")) return new Response("Não encontrado", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 60);
  const dep = Number(sp.get("dep")) || 0;
  const status = sp.get("status") ?? "";
  const manager = alias(schema.employees, "manager");
  const where: (SQL | undefined)[] = [];
  if (q) where.push(or(like(schema.employees.name, `%${q}%`), like(schema.employees.corporateEmail, `%${q}%`)));
  if (dep) where.push(eq(schema.employees.departmentId, dep));
  if (["ATIVO", "AFASTADO", "DESLIGADO"].includes(status)) where.push(eq(schema.employees.status, status as "ATIVO"));
  else if (status !== "TODOS") where.push(or(eq(schema.employees.status, "ATIVO"), eq(schema.employees.status, "AFASTADO")));

  const rows = db
    .select({
      name: schema.employees.name,
      email: schema.employees.corporateEmail,
      phone: schema.employees.phone,
      position: schema.positions.title,
      department: schema.departments.name,
      manager: manager.name,
      hiredAt: schema.employees.hiredAt,
      type: schema.employees.employmentType,
      status: schema.employees.status,
    })
    .from(schema.employees)
    .innerJoin(schema.positions, eq(schema.positions.id, schema.employees.positionId))
    .innerJoin(schema.departments, eq(schema.departments.id, schema.employees.departmentId))
    .leftJoin(manager, eq(manager.id, schema.employees.managerId))
    .where(and(...where))
    .orderBy(asc(schema.employees.name))
    .all();

  const esc = (v: string | null | undefined) => {
    const s = String(v ?? "");
    // evita injeção de fórmulas ao abrir no Excel
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ["Nome", "E-mail corporativo", "Telefone", "Cargo", "Departamento", "Gestor", "Admissão", "Contratação", "Situação"];
  const lines = rows.map((r) =>
    [r.name, r.email, r.phone, r.position, r.department, r.manager, r.hiredAt.split("-").reverse().join("/"), EMPLOYMENT_LABEL[r.type], EMPLOYEE_STATUS_LABEL[r.status]].map(esc).join(";"),
  );
  await audit(user, "DOWNLOAD", `Exportação CSV de funcionários (${rows.length} registros)`, { type: "employee" });
  return new Response("﻿" + [header.join(";"), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="funcionarios-ams-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
