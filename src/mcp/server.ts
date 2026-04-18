import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { Hono } from "hono";
import { getAllTasks, createTask, updateTask, deleteTask, saveDb, getStats } from "../db/index.js";
import type { TaskStatus, TaskPriority } from "../db/index.js";

export function createMcpServer() {
  const server = new McpServer({ name: "taskchecker", version: "1.0.0" });

  server.tool("create_task", "Create a new task in TaskChecker", {
    title: z.string().describe("Task title"),
    description: z.string().optional().describe("Task description"),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Task priority"),
    category: z.string().optional().describe("Task category/project"),
    tags: z.array(z.string()).optional().describe("Task tags"),
    dueDate: z.string().optional().describe("Due date in ISO format"),
  }, async ({ title, description, priority, category, tags, dueDate }) => {
    const now = Date.now();
    const t = createTask({
      title, description: description || null, priority: priority || "medium", source: "mcp",
      status: "active", category: category || null, tags: tags || [],
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
      createdAt: now, completedAt: null, updatedAt: now,
    });
    await saveDb();
    return { content: [{ type: "text" as const, text: JSON.stringify({ id: t.id, title: t.title, status: t.status, created: true }) }] };
  });

  server.tool("complete_task", "Mark a task as completed", {
    id: z.string().describe("Task ID to complete"),
  }, async ({ id }) => {
    const now = Date.now();
    updateTask(id, { status: "completed", completedAt: now, updatedAt: now });
    await saveDb();
    return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "completed" }) }] };
  });

  server.tool("list_tasks", "List tasks with optional filtering", {
    status: z.enum(["active", "in_progress", "completed", "cancelled", "all"]).optional().describe("Filter by status"),
    category: z.string().optional().describe("Filter by category"),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Filter by priority"),
  }, async ({ status, category, priority }) => {
    let tasks = getAllTasks();
    if (status && status !== "all") tasks = tasks.filter(t => t.status === status);
    if (category) tasks = tasks.filter(t => t.category === category);
    if (priority) tasks = tasks.filter(t => t.priority === priority);
    return { content: [{ type: "text" as const, text: JSON.stringify(tasks) }] };
  });

  server.tool("update_task", "Update an existing task", {
    id: z.string().describe("Task ID"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("New priority"),
    status: z.enum(["active", "in_progress", "completed", "cancelled"]).optional().describe("New status"),
    category: z.string().optional().describe("New category"),
    tags: z.array(z.string()).optional().describe("New tags"),
    dueDate: z.string().optional().describe("New due date in ISO format, or empty string to remove"),
  }, async ({ id, title, description, priority, status, category, tags, dueDate }) => {
    const now = Date.now();
    const u: Record<string, unknown> = { updatedAt: now };
    if (title !== undefined) u.title = title;
    if (description !== undefined) u.description = description;
    if (priority !== undefined) u.priority = priority;
    if (status !== undefined) {
      u.status = status;
      if (status === "completed") u.completedAt = now;
    }
    if (category !== undefined) u.category = category || null;
    if (tags !== undefined) u.tags = tags;
    if (dueDate !== undefined) u.dueDate = dueDate ? new Date(dueDate).getTime() : null;
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

  server.tool("get_stats", "Get task statistics and overview", {}, async () => {
    return { content: [{ type: "text" as const, text: JSON.stringify(getStats()) }] };
  });

  return server;
}

export function setupMcpRoutes(app: Hono) {
  app.all("/mcp", async (c) => {
    try {
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      const mcpServer = createMcpServer();
      await mcpServer.connect(transport);
      const response = await transport.handleRequest(c.req.raw);
      return response;
    } catch (e) {
      console.error("[TC] MCP error:", e);
      return c.json({ error: "MCP request failed" }, 500);
    }
  });

  app.all("/mcp/*", async (c) => {
    return c.json({ error: "MCP endpoint - use /mcp" }, 400);
  });
}