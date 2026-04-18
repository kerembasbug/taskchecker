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

console.log(`[TC DB] Data dir: ${dataDir}`);
console.log(`[TC DB] DB file: ${dbFilePath}`);
console.log(`[TC DB] CWD: ${process.cwd()}`);

const wasmPaths = [
  path.join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
  path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
  "/app/node_modules/sql.js/dist/sql-wasm.wasm",
];

let wasmPath = wasmPaths[0];
for (const p of wasmPaths) {
  if (fs.existsSync(p)) {
    wasmPath = p;
    console.log(`[TC DB] Found WASM at: ${p}`);
    break;
  }
}

if (!fs.existsSync(wasmPath)) {
  console.error(`[TC DB] FATAL: WASM file not found! Tried: ${wasmPaths.join(", ")}`);
  throw new Error(`WASM file not found!`);
}

const wasmBuffer = new Uint8Array(fs.readFileSync(wasmPath));
console.log(`[TC DB] Loading WASM from: ${wasmPath} (${wasmBuffer.length} bytes)`);

const SQL = await initSqlJs({ wasmBinary: wasmBuffer as any });

let sqlDb: initSqlJs.Database;
if (fs.existsSync(dbFilePath)) {
  const buffer = fs.readFileSync(dbFilePath);
  sqlDb = new SQL.Database(buffer);
  console.log(`[TC DB] Loaded existing database`);
} else {
  sqlDb = new SQL.Database();
  console.log(`[TC DB] Created new database`);
}

sqlDb.run("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'active', priority TEXT NOT NULL DEFAULT 'medium', source TEXT NOT NULL DEFAULT 'web', created_at INTEGER NOT NULL, completed_at INTEGER, updated_at INTEGER NOT NULL)");

export const saveDb = () => {
  const data = sqlDb.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
};

export const db = drizzle(sqlDb, { schema });

console.log(`[TC DB] DB initialized successfully at: ${dbFilePath}`);