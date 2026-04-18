console.log("[TC] Starting server...");

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

console.log("[TC] Step 1: Base imports OK");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");

// Import DB (with top-level await)
console.log("[TC] Step 2: About to import DB...");
const { db, saveDb } = await import("./db/index.js");
console.log("[TC] Step 3: DB imported OK");

import { tasks } from "./db/schema.js";
import { eq, desc } from "drizzle-orm";
console.log("[TC] Step 4: Schema imported OK");

import { login } from "./api/auth.js";
console.log("[TC] Step 5: Auth imported OK");

const app = new Hono();
console.log("[TC] Step 6: App created");

// Serve static files
app.get("/", (c) => {
  try {
    const filePath = path.join(publicDir, "index.html");
    const html = fs.readFileSync(filePath, "utf-8");
    return c.html(html);
  } catch (e) {
    return c.text("Error reading index.html: " + (e as Error).message, 500);
  }
});

app.get("/login", (c) => {
  try {
    const filePath = path.join(publicDir, "login.html");
    const html = fs.readFileSync(filePath, "utf-8");
    return c.html(html);
  } catch (e) {
    return c.text("Error reading login.html: " + (e as Error).message, 500);
  }
});

app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.post("/api/auth/login", async (c) => {
  const { password } = await c.req.json();
  const token = await login(password);
  if (!token) return c.json({ error: "Invalid password" }, 401);
  return c.json({ token });
});

app.get("/api/tasks", async (c) => {
  const statusFilter = c.req.query("status") || "all";
  let result;
  if (statusFilter === "active") result = await db.select().from(tasks).where(eq(tasks.status, "active")).orderBy(desc(tasks.createdAt));
  else if (statusFilter === "completed") result = await db.select().from(tasks).where(eq(tasks.status, "completed")).orderBy(desc(tasks.createdAt));
  else result = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  return c.json(result);
});

app.post("/api/tasks", async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const now = new Date();
  const newTask = { id, title: body.title, description: body.description || null, priority: body.priority || "medium", source: body.source || "api", status: "active" as const, createdAt: now, updatedAt: now };
  await db.insert(tasks).values(newTask);
  saveDb();
  return c.json(newTask, 201);
});

app.patch("/api/tasks/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.status !== undefined) { updates.status = body.status; if (body.status === "completed") updates.completedAt = now; }
  await db.update(tasks).set(updates).where(eq(tasks.id, id));
  saveDb();
  const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
  return c.json(updated);
});

app.delete("/api/tasks/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(tasks).where(eq(tasks.id, id));
  saveDb();
  return c.json({ ok: true });
});

// MCP routes (lazy)
console.log("[TC] Step 7: About to import MCP...");
const { setupMcpRoutes } = await import("./mcp/server.js");
setupMcpRoutes(app);
console.log("[TC] Step 8: MCP routes set up");

// WebSocket (without injectWebSocket to avoid crash)
console.log("[TC] Step 9: Skipping WebSocket for now");

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.log(`[TC] Server running on http://0.0.0.0:${port}`);