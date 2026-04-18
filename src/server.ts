console.log("[TaskChecker] === Server starting ===");
console.log("[TaskChecker] NODE_ENV:", process.env.NODE_ENV);
console.log("[TaskChecker] PORT:", process.env.PORT);
console.log("[TaskChecker] HOSTNAME:", process.env.HOSTNAME);
console.log("[TaskChecker] DATABASE_PATH:", process.env.DATABASE_PATH);
console.log("[TaskChecker] CWD:", process.cwd());
console.log("[TaskChecker] __dirname equivalent:", import.meta.url);

import { serve } from "@hono/node-server";
import { app, injectWebSocket } from "./index.js";

const port = Number(process.env.PORT) || 3000;
console.log(`[TaskChecker] About to listen on port ${port}...`);

try {
  serve({ fetch: app.fetch, port, createServer: injectWebSocket } as any);
  console.log(`[TaskChecker] Server started on http://0.0.0.0:${port}`);
} catch (err) {
  console.error(`[TaskChecker] FATAL: Failed to start server:`, err);
  process.exit(1);
}