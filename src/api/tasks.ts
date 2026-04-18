import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db, saveDb } from "../db/index.js";
import { tasks } from "../db/schema.js";
import { authMiddleware } from "./auth.js";
import { broadcastTask } from "../ws.js";

const app = new Hono();

app.use("/*", authMiddleware);

app.get("/", async (c) => {
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

app.post("/", async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const now = new Date();

  const newTask = {
    id,
    title: body.title,
    description: body.description || null,
    priority: body.priority || "medium",
    source: body.source || "api",
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(tasks).values(newTask);
  saveDb();
  
  broadcastTask("created", newTask);
  return c.json(newTask, 201);
});

app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const now = new Date();

  const updates: Record<string, unknown> = { updatedAt: now };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "completed") updates.completedAt = now;
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, id));
  saveDb();
  
  const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
  broadcastTask("updated", updated);
  return c.json(updated);
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(tasks).where(eq(tasks.id, id));
  saveDb();
  
  broadcastTask("deleted", { id });
  return c.json({ ok: true });
});

export default app;