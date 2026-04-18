import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { login, authMiddleware } from "./api/auth.js";
import tasksApi from "./api/tasks.js";
import { setupMcpRoutes } from "./mcp/server.js";
import { addClient, removeClient } from "./ws.js";

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use("/public/*", serveStatic({ root: "./" }));
app.use("/assets/*", serveStatic({ root: "./public" }));

app.get("/", serveStatic({ root: "./public", path: "index.html" }));
app.get("/login", serveStatic({ root: "./public", path: "login.html" }));

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