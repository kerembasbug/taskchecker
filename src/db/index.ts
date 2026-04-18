import { JSONFilePreset } from "lowdb/node";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATABASE_PATH || path.join(__dirname, "..", "data");
const dbFilePath = path.join(dataDir, "taskchecker.json");

export type TaskStatus = "active" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskSource = "web" | "mcp" | "api";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  source: TaskSource;
  category: string | null;
  tags: string[];
  dueDate: number | null;
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

  for (const t of db.data.tasks) {
    if (!t.tags) t.tags = [];
    if (!t.category) t.category = null;
    if (!t.dueDate) t.dueDate = null;
    if (t.status === ("pending" as string)) t.status = "active";
    if (!["active", "in_progress", "completed", "cancelled"].includes(t.status)) t.status = "active";
  }
  await db.write();

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

export function getStats(): Record<string, unknown> {
  const tasks = getDb().data.tasks;
  const total = tasks.length;
  const active = tasks.filter(t => t.status === "active").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const cancelled = tasks.filter(t => t.status === "cancelled").length;
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== "completed" && t.status !== "cancelled").length;
  const categories: Record<string, number> = {};
  for (const t of tasks) {
    const cat = t.category || "uncategorized";
    categories[cat] = (categories[cat] || 0) + 1;
  }
  const allTags: Record<string, number> = {};
  for (const t of tasks) {
    for (const tag of t.tags) {
      allTags[tag] = (allTags[tag] || 0) + 1;
    }
  }
  return {
    total, active, inProgress, completed, cancelled, overdue,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    categories,
    tags: allTags,
  };
}