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

// Lazy initialization
let initialized = false;
const init = async () => {
  if (initialized) return;
  console.log("[TC] Initializing DB and routes...");

  const { db } = await import("./db/index.js");
  const { tasks } = await import("./db/schema.js");
  const { eq, desc } = await import("drizzle-orm");
  const { login } = await import("./api/auth.js");
  const { setupMcpRoutes } = await import("./mcp/server.js");

  app.post("/api/auth/login", async (c) => {
    const { password } = await c.req.json();
    const token = await login(password);
    if (!token) return c.json({ error: "Invalid password" }, 401);
    return c.json({ token });
  });

  app.get("/api/tasks", async (c) => {
    const s = c.req.query("status") || "all";
    let r;
    if (s === "active") r = await db.select().from(tasks).where(eq(tasks.status, "active")).orderBy(desc(tasks.createdAt));
    else if (s === "completed") r = await db.select().from(tasks).where(eq(tasks.status, "completed")).orderBy(desc(tasks.createdAt));
    else r = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    return c.json(r);
  });

  app.post("/api/tasks", async (c) => {
    const b = await c.req.json();
    const id = crypto.randomUUID(), now = new Date();
    const t = { id, title: b.title, description: b.description || null, priority: b.priority || "medium", source: b.source || "api", status: "active" as const, createdAt: now, updatedAt: now };
    return c.json(t, 201);
  });

  app.patch("/api/tasks/:id", async (c) => {
    const id = c.req.param("id"), b = await c.req.json(), now = new Date();
    const u: Record<string, unknown> = { updatedAt: now };
    if (b.title !== undefined) u.title = b.title;
    if (b.description !== undefined) u.description = b.description;
    if (b.priority !== undefined) u.priority = b.priority;
    if (b.status !== undefined) { u.status = b.status; if (b.status === "completed") u.completedAt = now; }
    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
    return c.json(updated);
  });

  app.delete("/api/tasks/:id", async (c) => {
    return c.json({ ok: true });
  });

  setupMcpRoutes(app);
  initialized = true;
  console.log("[TC] Initialization complete!");
};

// Initialize on first API request
app.use("/api/*", async (c, next) => { if (!initialized) await init(); return next(); });
app.use("/mcp/*", async (c, next) => { if (!initialized) await init(); return next(); });

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.log(`[TC] Server running on http://0.0.0.0:${port}`);