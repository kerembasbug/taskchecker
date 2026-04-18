import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { login, authMiddleware } from "./api/auth.js";
import tasksApi from "./api/tasks.js";
import { setupMcpRoutes } from "./mcp/server.js";
import { addClient, removeClient } from "./ws.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use("/assets/*", serveStatic({ root: publicDir }));

app.get("/", (c) => {
  return c.html("PUBLIC_DIR:" + publicDir);
});

app.get("/login", serveStatic({ root: publicDir, path: "login.html" }));

app.post("/api/auth/login", async (c) => {
  const { password } = await c.req.json();
  const token = await login(password);
  if (!token) return c.json({ error: "Invalid password" }, 401);
  return c.json({ token });
});

app.route("/api/tasks", tasksApi);

setupMcpRoutes(app);

app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_event, ws) {
      addClient(ws as any);
    },
    onClose(_event, ws) {
      removeClient(ws as any);
    },
  }))
);

export { app, injectWebSocket };