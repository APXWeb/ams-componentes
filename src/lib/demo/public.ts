import { createSeed } from "./seed";
import type { DemoData } from "./types";

/*
 * Leitura dos dados de demonstração no servidor (títulos de página e site público).
 * O estado alterado durante a demo vive no navegador; aqui vale sempre o estado inicial do dia.
 */
let cache: { day: string; data: DemoData } | null = null;

export function seedToday(): DemoData {
  const day = new Date().toLocaleDateString("sv-SE");
  if (!cache || cache.day !== day) cache = { day, data: createSeed() };
  return cache.data;
}

export type PublicVacancy = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  requirements: string;
  additionalInfo: string | null;
  location: string;
  employmentType: DemoData["vacancies"][number]["employmentType"];
  openings: number;
  publishedAt: string | null;
  department: string;
};

/** Somente vagas publicadas e seus campos públicos chegam ao site. */
export function publicVacancies(d: DemoData): PublicVacancy[] {
  return d.vacancies
    .filter((v) => v.status === "ABERTA")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.title,
      summary: v.summary,
      description: v.description,
      requirements: v.requirements,
      additionalInfo: v.additionalInfo,
      location: v.location,
      employmentType: v.employmentType,
      openings: v.openings,
      publishedAt: v.publishedAt,
      department: d.departments.find((x) => x.id === v.departmentId)?.name ?? "",
    }));
}

export const getOpenVacancies = () => publicVacancies(seedToday());
export const getDepartmentsPublic = () => seedToday().departments.map((x) => ({ name: x.name, description: x.description }));

/**
 * Ids gerados como páginas estáticas: os do estado inicial mais uma folga para os registros
 * criados durante a demonstração (novo funcionário, nova solicitação, contratação...).
 */
export function staticIds(table: "employees" | "applications" | "requests" | "vacancies", spare = 40) {
  const max = Math.max(0, ...seedToday()[table].map((x) => x.id));
  return Array.from({ length: max + spare }, (_, i) => ({ id: String(i + 1) }));
}
