console.log("[TC] Step 1: Starting server...");

import { Hono } from "hono";
console.log("[TC] Step 2: Hono imported");

import { serve } from "@hono/node-server";
console.log("[TC] Step 3: serve imported");

const app = new Hono();
console.log("[TC] Step 4: app created");

app.get("/", (c) => c.text("TaskChecker OK - index"));
app.get("/login", (c) => c.text("Login page - placeholder"));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

const port = Number(process.env.PORT) || 3000;
console.log(`[TC] Listening on port ${port}...`);
serve({ fetch: app.fetch, port });
console.log(`[TC] Server running on http://0.0.0.0:${port}`);