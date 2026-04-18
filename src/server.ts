console.log("[TC] Step 1: Starting server...");

import { Hono } from "hono";
console.log("[TC] Step 2: Hono imported");

import { serve } from "@hono/node-server";
console.log("[TC] Step 3: serve imported");

import { createNodeWebSocket } from "@hono/node-ws";
console.log("[TC] Step 4: node-ws imported");

import { serveStatic } from "@hono/node-server/serve-static";
console.log("[TC] Step 5: serveStatic imported");

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
console.log("[TC] Step 6: fs/path imported");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");
console.log("[TC] Step 7: publicDir =", publicDir);

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
console.log("[TC] Step 8: WebSocket created");

// Static files
app.use("/assets/*", serveStatic({ root: publicDir }));
app.get("/", (c) => {
  const filePath = path.join(publicDir, "index.html");
  const html = fs.readFileSync(filePath, "utf-8");
  return c.html(html);
});
app.get("/login", (c) => {
  const filePath = path.join(publicDir, "login.html");
  const html = fs.readFileSync(filePath, "utf-8");
  return c.html(html);
});
console.log("[TC] Step 9: Routes registered");

// Health check (no DB needed)
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

// Lazy-load DB-dependent routes
let dbInitialized = false;
const initDb = async () => {
  if (dbInitialized) return;
  console.log("[TC] Initializing DB...");
  const { db, saveDb } = await import("./db/index.js");
  const { tasks } = await import("./db/schema.js");
  const { eq, desc } = await import("drizzle-orm");
  const { login } = await import("./api/auth.js");
  const { broadcastTask, addClient, removeClient } = await import("./ws.js");

  app.post("/api/auth/login", async (c) => {
    const { password } = await c.req.json();
    const token = await login(password);
    if (!token) return c.json({ error: "Invalid password" }, 401);
    return c.json({ token });
  });

  app.get("/api/tasks", async (c) => {
    const statusFilter = c.req.query("status") || "all";
    let result;
    if (statusFilter === "active") {
      result = await db.select().from(tasks).where(eq(tasks.status, "active")).orderBy(desc(tasks.createdAt));
    } else if (statusFilter === "completed") {
      result = await db.select().from(tasks).where(eq(tasks.status, "completed")).orderBy(desc(tasks.createdAt));
    } else {
      result = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    }
    return c.json(result);
  });

  app.post("/api/tasks", async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = new Date();
    const newTask = {
      id, title: body.title, description: body.description || null,
      priority: body.priority || "medium", source: body.source || "api",
      status: "active" as const, createdAt: now, updatedAt: now,
    };
    await db.insert(tasks).values(newTask);
    saveDb();
    broadcastTask("created", newTask);
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
    broadcastTask("updated", updated);
    return c.json(updated);
  });

  app.delete("/api/tasks/:id", async (c) => {
    const id = c.req.param("id");
    await db.delete(tasks).where(eq(tasks.id, id));
    saveDb();
    broadcastTask("deleted", { id });
    return c.json({ ok: true });
  });

  // MCP routes (lazy)
  const { setupMcpRoutes } = await import("./mcp/server.js");
  setupMcpRoutes(app);

  // WebSocket
  app.get("/ws", upgradeWebSocket(() => ({
    onOpen(_event, ws) { addClient(ws as any); },
    onClose(_event, ws) { removeClient(ws as any); },
  })));

  dbInitialized = true;
  console.log("[TC] DB and routes initialized!");
};

// Initialize DB on first request
app.use("/api/*", async (c, next) => {
  if (!dbInitialized) await initDb();
  return next();
});

app.use("/ws", async (c, next) => {
  if (!dbInitialized) await initDb();
  return next();
});

app.use("/mcp/*", async (c, next) => {
  if (!dbInitialized) await initDb();
  return next();
});

const port = Number(process.env.PORT) || 3000;
console.log(`[TC] Starting server on port ${port}...`);

serve({ fetch: app.fetch, port, createServer: injectWebSocket } as any);
console.log(`[TC] Server listening on http://0.0.0.0:${port}`);