import { Hono } from "hono";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb, getAllTasks, getTaskById, createTask, updateTask, deleteTask, saveDb, getStats } from "./db/index.js";
import type { TaskStatus, TaskPriority, TaskSource } from "./db/index.js";
import { login, authMiddleware } from "./api/auth.js";
import { setupMcpRoutes } from "./mcp/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT) || 3000;

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.get("/", (c) => {
  try { return c.html(fs.readFileSync(path.join(publicDir, "index.html"), "utf-8")); }
  catch { return c.text("Index not found", 500); }
});

app.get("/login", (c) => {
  try { return c.html(fs.readFileSync(path.join(publicDir, "login.html"), "utf-8")); }
  catch { return c.text("Login not found", 500); }
});

app.post("/api/auth/login", async (c) => {
  try {
    const { password } = await c.req.json();
    const token = await login(password);
    if (!token) return c.json({ error: "Invalid password" }, 401);
    return c.json({ token });
  } catch (e) {
    console.error("[TC] Login error:", e);
    return c.json({ error: "Login failed" }, 500);
  }
});

app.use("/api/*", authMiddleware);

app.get("/api/stats", (c) => c.json(getStats()));

app.get("/api/tasks", (c) => {
  let tasks = getAllTasks();
  const status = c.req.query("status");
  const priority = c.req.query("priority");
  const category = c.req.query("category");
  const search = c.req.query("search");
  const tag = c.req.query("tag");

  if (status && status !== "all") tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (category) tasks = tasks.filter(t => t.category === category);
  if (tag) tasks = tasks.filter(t => t.tags.includes(tag));
  if (search) {
    const q = search.toLowerCase();
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
  }

  const sort = c.req.query("sort") || "createdAt";
  const order = c.req.query("order") || "desc";
  tasks = tasks.sort((a, b) => {
    let cmp = 0;
    if (sort === "createdAt") cmp = a.createdAt - b.createdAt;
    else if (sort === "updatedAt") cmp = a.updatedAt - b.updatedAt;
    else if (sort === "dueDate") cmp = (a.dueDate || Infinity) - (b.dueDate || Infinity);
    else if (sort === "priority") {
      const p: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      cmp = (p[a.priority] || 2) - (p[b.priority] || 2);
    }
    return order === "asc" ? cmp : -cmp;
  });

  return c.json(tasks);
});

app.post("/api/tasks", async (c) => {
  const b = await c.req.json();
  const now = Date.now();
  const t = createTask({
    title: b.title,
    description: b.description || null,
    priority: (b.priority as TaskPriority) || "medium",
    source: (b.source as TaskSource) || "api",
    status: (b.status as TaskStatus) || "active",
    category: b.category || null,
    tags: Array.isArray(b.tags) ? b.tags : [],
    dueDate: b.dueDate ? Number(b.dueDate) : null,
    createdAt: now,
    completedAt: null,
    updatedAt: now,
  });
  await saveDb();
  return c.json(t, 201);
});

app.patch("/api/tasks/:id", async (c) => {
  const id = c.req.param("id"), b = await c.req.json(), now = Date.now();
  const u: Record<string, unknown> = { updatedAt: now };
  if (b.title !== undefined) u.title = b.title;
  if (b.description !== undefined) u.description = b.description;
  if (b.priority !== undefined) u.priority = b.priority;
  if (b.status !== undefined) {
    u.status = b.status;
    if (b.status === "completed") u.completedAt = now;
    if (b.status === "active" || b.status === "in_progress") u.completedAt = null;
  }
  if (b.category !== undefined) u.category = b.category;
  if (b.tags !== undefined) u.tags = b.tags;
  if (b.dueDate !== undefined) u.dueDate = b.dueDate ? Number(b.dueDate) : null;
  const updated = updateTask(id, u);
  await saveDb();
  return c.json(updated || { error: "Not found" }, updated ? 200 : 404);
});

app.delete("/api/tasks/:id", async (c) => {
  deleteTask(c.req.param("id"));
  await saveDb();
  return c.json({ ok: true });
});

setupMcpRoutes(app);

async function start() {
  try {
    console.log("[TC] Initializing database...");
    await initDb();
    console.log("[TC] Database initialized.");
  } catch (e) {
    console.error("[TC] Failed to initialize database:", e);
    process.exit(1);
  }

  serve({ fetch: app.fetch, port }, () => {
    console.log(`[TC] Server running on http://0.0.0.0:${port}`);
  });
}

start();