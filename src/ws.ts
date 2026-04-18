import type { WSContext } from "hono/ws";

const clients = new Set<WSContext>();

export function addClient(ws: WSContext) {
  clients.add(ws);
}

export function removeClient(ws: WSContext) {
  clients.delete(ws);
}

export function broadcastTask(event: string, data: unknown) {
  const message = JSON.stringify({ event, data, timestamp: Date.now() });
  for (const client of clients) {
    try {
      if (client.readyState === 1) {
        client.send(message);
      }
    } catch {
      clients.delete(client);
    }
  }
}