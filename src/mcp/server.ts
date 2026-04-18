import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { Hono } from "hono";
import { getAllTasks, getTaskById, createTask, updateTask, deleteTask, saveDb } from "../db/index.js";

const mcpSessions = new Map<string, { server: McpServer; transport: WebStandardStreamableHTTPServerTransport }>();

export function createMcpServer() {
  const server = new McpServer({ name: "taskchecker", version: "1.0.0" });

  server.tool("create_task", "Create a new task in TaskChecker", {
    title: z.string().describe("Task title"),
    description: z.string().optional().describe("Task description"),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Task priority"),
  }, async ({ title, description, priority }) => {
    const now = Date.now();
    const t = createTask({ title, description: description || null, priority: priority || "medium", source: "mcp", status: "active", createdAt: now, completedAt: null, updatedAt: now });
    await saveDb();
    return { content: [{ type: "text" as const, text: JSON.stringify({ id: t.id, title: t.title, status: "active", created: true }) }] };
  });

  server.tool("complete_task", "Mark a task as completed", {
    id: z.string().describe("Task ID to complete"),
  }, async ({ id }) => {
    const now = Date.now();
    updateTask(id, { status: "completed", completedAt: now, updatedAt: now });
    await saveDb();
    return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "completed" }) }] };
  });

  server.tool("list_tasks", "List all tasks", {
    status: z.enum(["active", "completed", "all"]).optional().describe("Filter by status"),
  }, async ({ status: sf }) => {
    const tasks = getAllTasks();
    let result;
    if (sf === "active") result = tasks.filter(t => t.status === "active");
    else if (sf === "completed") result = tasks.filter(t => t.status === "completed");
    else result = tasks;
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });

  server.tool("update_task", "Update an existing task", {
    id: z.string().describe("Task ID"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("New priority"),
  }, async ({ id, title, description, priority }) => {
    const now = Date.now();
    const u: Record<string, unknown> = { updatedAt: now };
    if (title !== undefined) u.title = title;
    if (description !== undefined) u.description = description;
    if (priority !== undefined) u.priority = priority;
    const updated = updateTask(id, u);
    await saveDb();
    return { content: [{ type: "text" as const, text: JSON.stringify(updated || { id, updated: true }) }] };
  });

  server.tool("delete_task", "Delete a task", {
    id: z.string().describe("Task ID"),
  }, async ({ id }) => {
    deleteTask(id);
    await saveDb();
    return { content: [{ type: "text" as const, text: JSON.stringify({ id, deleted: true }) }] };
  });

  return server;
}

export function setupMcpRoutes(app: Hono) {
  app.all("/mcp", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
    const sessionId = transport.sessionId;
    if (sessionId) mcpSessions.set(sessionId, { server: mcpServer, transport });
    const request = new Request(c.req.url, { method: c.req.method, headers: c.req.raw.headers, body: c.req.raw.body });
    const response = await transport.handleRequest(request);
    if (sessionId) mcpSessions.delete(sessionId);
    return new Response(response.body, { status: response.status, headers: response.headers });
  });

  app.all("/mcp/*", async (c) => {
    const request = new Request(c.req.url, { method: c.req.method, headers: c.req.raw.headers, body: c.req.raw.body });
    const sessionId = request.headers.get("mcp-session-id");
    if (sessionId && mcpSessions.has(sessionId)) {
      const { transport } = mcpSessions.get(sessionId)!;
      const response = await transport.handleRequest(request);
      return new Response(response.body, { status: response.status, headers: response.headers });
    }
    return c.json({ error: "Invalid session" }, 400);
  });
}