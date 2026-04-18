import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
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

console.log(`[TaskChecker] Initializing database at: ${dbFilePath}`);

let sqlDb: initSqlJs.Database;
let dbInstance: ReturnType<typeof drizzle<typeof schema>>;

const wasmPath = path.join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm");
console.log(`[TaskChecker] WASM path: ${wasmPath}, exists: ${fs.existsSync(wasmPath)}`);

const wasmBuffer = new Uint8Array(fs.readFileSync(wasmPath));
const SQL = await initSqlJs({ wasmBinary: wasmBuffer as any });

if (fs.existsSync(dbFilePath)) {
  const buffer = fs.readFileSync(dbFilePath);
  sqlDb = new SQL.Database(buffer);
  console.log(`[TaskChecker] Loaded existing database`);
} else {
  sqlDb = new SQL.Database();
  console.log(`[TaskChecker] Created new database`);
}

sqlDb.run("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'active', priority TEXT NOT NULL DEFAULT 'medium', source TEXT NOT NULL DEFAULT 'web', created_at INTEGER NOT NULL, completed_at INTEGER, updated_at INTEGER NOT NULL)");

export const saveDb = () => {
  const data = sqlDb.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
};

dbInstance = drizzle(sqlDb, { schema });

export const db = dbInstance;

console.log(`[TaskChecker] DB initialized successfully`);