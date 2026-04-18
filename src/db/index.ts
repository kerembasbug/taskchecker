import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import * as schema from "./schema.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const dataDir = process.env.DATABASE_PATH || path.join(process.cwd(), "data");
const dbFilePath = path.join(dataDir, "taskchecker.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const SQL = await initSqlJs({
  locateFile: (file: string) => {
    const paths = [
      path.join(process.cwd(), "sql-wasm.wasm"),
      path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
      path.join(__dirname, "..", "node_modules", "sql.js", "dist", file),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    return file;
  }
});

let sqlDb: initSqlJs.Database;
if (fs.existsSync(dbFilePath)) {
  const buffer = fs.readFileSync(dbFilePath);
  sqlDb = new SQL.Database(buffer);
} else {
  sqlDb = new SQL.Database();
}

sqlDb.run("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'active', priority TEXT NOT NULL DEFAULT 'medium', source TEXT NOT NULL DEFAULT 'web', created_at INTEGER NOT NULL, completed_at INTEGER, updated_at INTEGER NOT NULL)");

export const saveDb = () => {
  const data = sqlDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbFilePath, buffer);
};

export const db = drizzle(sqlDb, { schema });

console.log(`[DB] Connected to: ${dbFilePath}`);