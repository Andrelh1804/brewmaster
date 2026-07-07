import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { attachMqttBroker } from "./lib/mqtt/broker";
import { attachFrontendWebSocket } from "./lib/websocket";
import { WebSocket } from "ws";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Create an HTTP server wrapping the Express app so we can upgrade WebSocket
// connections at specific paths alongside normal HTTP traffic.
const server = http.createServer(app);

// Attach MQTT broker (devices connect via ws://<host>/mqtt)
await attachMqttBroker(server);

// Attach frontend real-time push (frontend connects via ws://<host>/ws)
attachFrontendWebSocket(server);

// Route HTTP Upgrade requests to the correct WebSocket server based on path
server.on("upgrade", (request, socket, head) => {
  const url = request.url ?? "";
  const s = server as unknown as Record<string, unknown>;

  if (url.startsWith("/mqtt")) {
    const mqttWss = s["__mqttWss"] as { handleUpgrade: Function; emit: Function } | undefined;
    if (mqttWss) {
      mqttWss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        mqttWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  } else if (url.startsWith("/ws")) {
    const frontendWss = s["__frontendWss"] as { handleUpgrade: Function; emit: Function } | undefined;
    if (frontendWss) {
      frontendWss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        frontendWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  } else {
    socket.destroy();
  }
});

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
