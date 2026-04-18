console.log("[TC] Starting server...");

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = new Hono();
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.get("/", (c) => {
  try {
    return c.html(fs.readFileSync(path.join(publicDir, "index.html"), "utf-8"));
  } catch { return c.text("Index not found", 500); }
});

app.get("/login", (c) => {
  try {
    return c.html(fs.readFileSync(path.join(publicDir, "login.html"), "utf-8"));
  } catch { return c.text("Login not found", 500); }
});

// Lazy initialization of DB and routes
let initialized = false;
const init = async () => {
  if (initialized) return;
  console.log("[TC] Initializing...");

  const { getAllTasks, getTaskById, createTask, updateTask, deleteTask, saveDb } = await import("./db/index.js");
  const { login } = await import("./api/auth.js");
  const { setupMcpRoutes } = await import("./mcp/server.js");

  app.post("/api/auth/login", async (c) => {
    const { password } = await c.req.json();
    const token = await login(password);
    if (!token) return c.json({ error: "Invalid password" }, 401);
    return c.json({ token });
  });

  app.get("/api/tasks", async (c) => {
    await saveDb();
    const tasks = getAllTasks();
    const s = c.req.query("status") || "all";
    if (s === "active") return c.json(tasks.filter(t => t.status === "active"));
    if (s === "completed") return c.json(tasks.filter(t => t.status === "completed"));
    return c.json(tasks);
  });

  app.post("/api/tasks", async (c) => {
    const b = await c.req.json();
    const now = Date.now();
    const t = createTask({ title: b.title, description: b.description || null, priority: b.priority || "medium", source: b.source || "api", status: "active" as const, createdAt: now, completedAt: null, updatedAt: now });
    await saveDb();
    return c.json(t, 201);
  });

  app.patch("/api/tasks/:id", async (c) => {
    const id = c.req.param("id"), b = await c.req.json(), now = Date.now();
    const u: Record<string, unknown> = { updatedAt: now };
    if (b.title !== undefined) u.title = b.title;
    if (b.description !== undefined) u.description = b.description;
    if (b.priority !== undefined) u.priority = b.priority;
    if (b.status !== undefined) { u.status = b.status; if (b.status === "completed") u.completedAt = now; }
    const updated = updateTask(id, u);
    await saveDb();
    return c.json(updated || { error: "Not found" });
  });

  app.delete("/api/tasks/:id", async (c) => {
    deleteTask(c.req.param("id"));
    await saveDb();
    return c.json({ ok: true });
  });

  setupMcpRoutes(app);
  initialized = true;
  console.log("[TC] Initialized!");
};

app.use("/api/*", async (c, next) => { if (!initialized) await init(); return next(); });
app.use("/mcp/*", async (c, next) => { if (!initialized) await init(); return next(); });

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.log(`[TC] Server running on http://0.0.0.0:${port}`);