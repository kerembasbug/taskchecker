console.log("[TC] ===STEP1=== Server module loading...");

import { Hono } from "hono";
console.log("[TC] ===STEP2=== Hono imported");

import { serve } from "@hono/node-server";
console.log("[TC] ===STEP3=== serve imported");

const app = new Hono();
console.log("[TC] ===STEP4=== Hono app created");

app.get("/", (c) => {
  console.log("[TC] GET / requested");
  return c.text("TaskChecker OK");
});

app.get("/health", (c) => {
  return c.json({ status: "ok", time: new Date().toISOString() });
});

const port = Number(process.env.PORT) || 3000;
console.log(`[TC] ===STEP5=== About to listen on port ${port}...`);

serve({ fetch: app.fetch, port });
console.log(`[TC] ===STEP6=== Server listening on http://0.0.0.0:${port}`);