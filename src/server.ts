import { serve } from "@hono/node-server";
import { app, injectWebSocket } from "./index.js";

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port, createServer: injectWebSocket } as any);
console.log(`TaskChecker server started on port ${port}`);