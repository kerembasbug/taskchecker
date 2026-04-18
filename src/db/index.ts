import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("file:", "")
  : "./data/taskchecker.db";

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

console.log(`[DB] Connected to: ${dbPath}`);