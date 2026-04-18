console.log("[TC] Step 1: Starting server...");

import { Hono } from "hono";
console.log("[TC] Step 2: Hono imported");

import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
console.log("[TC] Step 3: imports done");

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
console.log("[TC] Step 4: app + ws created");

app.get("/", (c) => c.text("TaskChecker OK - index"));
app.get("/login", (c) => c.text("Login page - placeholder"));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.get("/ws", upgradeWebSocket(() => ({
  onOpen() { console.log("[TC] WS connected"); },
  onClose() { console.log("[TC] WS disconnected"); },
})));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port, createServer: injectWebSocket } as any);
console.log(`[TC] Server running on http://0.0.0.0:${port}`);