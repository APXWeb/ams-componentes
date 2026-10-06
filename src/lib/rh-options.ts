import "server-only";
import { asc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";

/** Cargos agrupados por departamento para selects. */
export function positionOptions() {
  const rows = db
    .select({ id: schema.positions.id, title: schema.positions.title, department: schema.departments.name })
    .from(schema.positions)
    .innerJoin(schema.departments, eq(schema.departments.id, schema.positions.departmentId))
    .orderBy(asc(schema.departments.name), asc(schema.positions.title))
    .all();
  const groups: { department: string; items: { value: number; label: string }[] }[] = [];
  for (const r of rows) {
    let g = groups.find((x) => x.department === r.department);
    if (!g) groups.push((g = { department: r.department, items: [] }));
    g.items.push({ value: r.id, label: r.title });
  }
  return groups;
}

export function activeEmployeeOptions() {
  return db
    .select({ value: schema.employees.id, label: schema.employees.name })
    .from(schema.employees)
    .where(ne(schema.employees.status, "DESLIGADO"))
    .orderBy(asc(schema.employees.name))
    .all();
}

export function departmentOptions() {
  return db.select({ value: schema.departments.id, label: schema.departments.name }).from(schema.departments).orderBy(asc(schema.departments.name)).all();
}
