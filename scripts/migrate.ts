/* Aplica as migrations pendentes (drizzle/) sem apagar dados. Usado na inicialização do servidor. */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "ams.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.close();
console.log(`Migrations aplicadas em ${DB_PATH}.`);
