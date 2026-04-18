import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/", (c) => c.text("TaskChecker is running!"));
app.get("/login", (c) => c.html("<h1>Login Page</h1>"));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

const port = Number(process.env.PORT) || 3000;
console.log(`[TaskChecker] Starting minimal server on port ${port}...`);
console.log(`[TaskChecker] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[TaskChecker] HOSTNAME: ${process.env.HOSTNAME}`);

serve({ fetch: app.fetch, port });

console.log(`[TaskChecker] Server listening on http://0.0.0.0:${port}`);