import { serve } from "@hono/node-server";
import { app, injectWebSocket } from "./index.js";

const port = Number(process.env.PORT) || 3000;

console.log(`[TaskChecker] Starting on port ${port}...`);
console.log(`[TaskChecker] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[TaskChecker] DATABASE_URL: ${process.env.DATABASE_URL}`);

try {
  serve({ fetch: app.fetch, port, createServer: injectWebSocket } as any);
  console.log(`[TaskChecker] Server listening on http://0.0.0.0:${port}`);
} catch (err) {
  console.error(`[TaskChecker] Failed to start:`, err);
  process.exit(1);
}