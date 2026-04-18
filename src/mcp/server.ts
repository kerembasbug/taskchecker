import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { Hono } from "hono";
import { db, saveDb } from "../db/index.js";
import { tasks } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { broadcastTask } from "../ws.js";

export function createMcpServer() {
  const server = new McpServer({
    name: "taskchecker",
    version: "1.0.0",
  });

  server.tool(
    "create_task",
    "Create a new task in TaskChecker",
    {
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Task priority"),
    },
    async ({ title, description, priority }) => {
      const id = crypto.randomUUID();
      const now = new Date();
      const newTask = {
        id,
        title,
        description: description || null,
        priority: priority || "medium",
        source: "mcp" as const,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(tasks).values(newTask);
      saveDb();
      
      broadcastTask("created", newTask);

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ id, title, status: "active", created: true }) }],
      };
    }
  );

  server.tool(
    "complete_task",
    "Mark a task as completed",
    {
      id: z.string().describe("Task ID to complete"),
    },
    async ({ id }) => {
      const now = new Date();
      await db
        .update(tasks)
        .set({ status: "completed", completedAt: now, updatedAt: now })
        .where(eq(tasks.id, id));
      saveDb();

      const results = await db.select().from(tasks).where(eq(tasks.id, id));
      if (results[0]) broadcastTask("updated", results[0]);

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ id, status: "completed" }) }],
      };
    }
  );

  server.tool(
    "list_tasks",
    "List all tasks",
    {
      status: z.enum(["active", "completed", "all"]).optional().describe("Filter by status"),
    },
    async ({ status: statusFilter }) => {
      let result;
      if (statusFilter === "active") {
        result = await db.select().from(tasks).where(eq(tasks.status, "active")).orderBy(desc(tasks.createdAt));
      } else if (statusFilter === "completed") {
        result = await db.select().from(tasks).where(eq(tasks.status, "completed")).orderBy(desc(tasks.createdAt));
      } else {
        result = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.tool(
    "update_task",
    "Update an existing task",
    {
      id: z.string().describe("Task ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("New priority"),
    },
    async ({ id, title, description, priority }) => {
      const now = new Date();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (priority !== undefined) updates.priority = priority;

      await db.update(tasks).set(updates).where(eq(tasks.id, id));
      saveDb();
      
      const results = await db.select().from(tasks).where(eq(tasks.id, id));
      if (results[0]) broadcastTask("updated", results[0]);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results[0] || { id, updated: true }) }],
      };
    }
  );

  server.tool(
    "delete_task",
    "Delete a task",
    {
      id: z.string().describe("Task ID to delete"),
    },
    async ({ id }) => {
      await db.delete(tasks).where(eq(tasks.id, id));
      saveDb();
      
      broadcastTask("deleted", { id });

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ id, deleted: true }) }],
      };
    }
  );

  return server;
}

const mcpSessions = new Map<string, { server: McpServer; transport: WebStandardStreamableHTTPServerTransport }>();

export function setupMcpRoutes(app: Hono) {
  app.all("/mcp", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);

    const sessionId = transport.sessionId;
    if (sessionId) {
      mcpSessions.set(sessionId, { server: mcpServer, transport });
    }

    const request = new Request(c.req.url, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });

    const response = await transport.handleRequest(request);

    mcpSessions.delete(sessionId || "");

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  });

  app.all("/mcp/*", async (c) => {
    const request = new Request(c.req.url, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });

    const sessionId = request.headers.get("mcp-session-id");
    if (sessionId && mcpSessions.has(sessionId)) {
      const { transport } = mcpSessions.get(sessionId)!;
      const response = await transport.handleRequest(request);
      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    }

    return c.json({ error: "Invalid session" }, 400);
  });
}