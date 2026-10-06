import "server-only";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";

export const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "ams.db");

type DB = BetterSQLite3Database<typeof schema>;
const globalForDb = globalThis as unknown as { __amsDb?: DB };

function open(): DB {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

export const db: DB = globalForDb.__amsDb ?? (globalForDb.__amsDb = open());
export { schema };
