console.log("[TC] Starting server...");

import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/", (c) => c.text("TaskChecker OK"));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.log(`[TC] Server running on http://0.0.0.0:${port}`);