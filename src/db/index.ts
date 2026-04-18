import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATABASE_PATH || path.join(__dirname, "..", "data");
const dbFilePath = path.join(dataDir, "taskchecker.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbFilePath);
sqlite.exec("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'active', priority TEXT NOT NULL DEFAULT 'medium', source TEXT NOT NULL DEFAULT 'web', created_at INTEGER NOT NULL, completed_at INTEGER, updated_at INTEGER NOT NULL)");

export const db = drizzle(sqlite, { schema });

console.log(`[TaskChecker] DB initialized at: ${dbFilePath}`);