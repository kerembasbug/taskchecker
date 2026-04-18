import { JSONFilePreset } from "lowdb/node";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATABASE_PATH || path.join(__dirname, "..", "data");
const dbFilePath = path.join(dataDir, "taskchecker.json");

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  source: "web" | "mcp" | "api";
  createdAt: number;
  completedAt: number | null;
  updatedAt: number;
}

interface DbData {
  tasks: Task[];
}

const defaultData: DbData = { tasks: [] };

let db: Awaited<ReturnType<typeof JSONFilePreset<DbData>>> | null = null;

export async function initDb(): Promise<void> {
  if (db) return;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  console.log(`[TC DB] Initializing lowdb at: ${dbFilePath}`);
  db = await JSONFilePreset<DbData>(dbFilePath, defaultData);
  console.log(`[TC DB] Initialized with ${db.data.tasks.length} tasks`);
}

function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

export const getAllTasks = (): Task[] => getDb().data.tasks;
export const getTaskById = (id: string): Task | undefined => getDb().data.tasks.find(t => t.id === id);

export const createTask = (task: Omit<Task, "id"> & { id?: string }): Task => {
  const newTask: Task = { ...task, id: task.id || crypto.randomUUID() };
  getDb().data.tasks.push(newTask);
  return newTask;
};

export const updateTask = (id: string, updates: Partial<Task>): Task | undefined => {
  const d = getDb();
  const idx = d.data.tasks.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  d.data.tasks[idx] = { ...d.data.tasks[idx], ...updates };
  return d.data.tasks[idx];
};

export const deleteTask = (id: string): boolean => {
  const d = getDb();
  const len = d.data.tasks.length;
  d.data.tasks = d.data.tasks.filter(t => t.id !== id);
  return d.data.tasks.length < len;
};

export const saveDb = async () => {
  await getDb().write();
};