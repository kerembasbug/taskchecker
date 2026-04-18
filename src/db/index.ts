import { JSONFilePreset } from "lowdb/node";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATABASE_PATH || path.join(__dirname, "..", "data");
const dbFilePath = path.join(dataDir, "taskchecker.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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

const db = await JSONFilePreset<DbData>(dbFilePath, defaultData);

export const getAllTasks = (): Task[] => db.data.tasks;
export const getTaskById = (id: string): Task | undefined => db.data.tasks.find(t => t.id === id);

export const createTask = (task: Omit<Task, "id"> & { id?: string }): Task => {
  const newTask: Task = {
    ...task,
    id: task.id || crypto.randomUUID(),
  };
  db.data.tasks.push(newTask);
  return newTask;
};

export const updateTask = (id: string, updates: Partial<Task>): Task | undefined => {
  const idx = db.data.tasks.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  db.data.tasks[idx] = { ...db.data.tasks[idx], ...updates };
  return db.data.tasks[idx];
};

export const deleteTask = (id: string): boolean => {
  const len = db.data.tasks.length;
  db.data.tasks = db.data.tasks.filter(t => t.id !== id);
  return db.data.tasks.length < len;
};

export const saveDb = async () => {
  await db.write();
};

console.log(`[TC DB] lowdb initialized at: ${dbFilePath} (${db.data.tasks.length} tasks)`);