/*
 * Retenção LGPD de candidatos: anonimiza quem passou da data de retenção (retain_until)
 * e não foi contratado, apagando currículo e dados de contato. Mantém apenas números
 * agregados (vaga, etapa, datas) para os indicadores.
 *
 *   npm run lgpd:retencao            -> executa
 *   npm run lgpd:retencao -- --dry   -> apenas lista o que seria anonimizado
 *
 * Agendar diariamente (cron / Agendador de Tarefas) no servidor de produção.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { and, eq, inArray, lt, ne } from "drizzle-orm";
import { unlinkSync } from "node:fs";
import path from "node:path";
import * as schema from "../src/db/schema";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "ams.db");
const STORAGE = process.env.STORAGE_PATH ?? path.join(process.cwd(), "storage");
const DRY = process.argv.includes("--dry");

const sqlite = new Database(DB_PATH);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

const expired = db
  .select({ id: schema.candidates.id, name: schema.candidates.name })
  .from(schema.candidates)
  .where(and(lt(schema.candidates.retainUntil, today), ne(schema.candidates.name, "Candidato anonimizado")))
  .all()
  .filter(
    (c) =>
      !db
        .select({ id: schema.applications.id })
        .from(schema.applications)
        .where(and(eq(schema.applications.candidateId, c.id), eq(schema.applications.outcome, "CONTRATADO")))
        .get(),
  );

console.log(`${expired.length} candidato(s) com retenção vencida${DRY ? " (simulação)" : ""}.`);
if (!DRY && expired.length) {
  const ids = expired.map((c) => c.id);
  const apps = db.select({ id: schema.applications.id }).from(schema.applications).where(inArray(schema.applications.candidateId, ids)).all().map((a) => a.id);
  const docs = apps.length ? db.select().from(schema.documents).where(inArray(schema.documents.applicationId, apps)).all() : [];
  db.transaction((tx) => {
    for (const c of expired) {
      tx.update(schema.candidates)
        .set({ name: "Candidato anonimizado", email: `anonimizado-${c.id}@invalid`, phone: "", city: "" })
        .where(eq(schema.candidates.id, c.id))
        .run();
    }
    if (apps.length) {
      tx.update(schema.applications).set({ message: null, notes: null }).where(inArray(schema.applications.id, apps)).run();
      tx.update(schema.applicationEvents).set({ note: null }).where(inArray(schema.applicationEvents.applicationId, apps)).run();
      tx.delete(schema.documents).where(inArray(schema.documents.applicationId, apps)).run();
    }
    tx.insert(schema.auditLogs)
      .values({ actorLabel: "Rotina LGPD", action: "EXCLUSAO", summary: `Retenção: ${expired.length} candidato(s) anonimizado(s) e ${docs.length} currículo(s) apagado(s)`, ip: "sistema" })
      .run();
  });
  for (const d of docs) {
    if (d.storageKey) {
      try {
        unlinkSync(path.join(STORAGE, d.storageKey));
      } catch {
        /* arquivo já removido */
      }
    }
  }
  console.log(`Anonimizados: ${expired.length}. Currículos apagados: ${docs.length}.`);
}
sqlite.close();
