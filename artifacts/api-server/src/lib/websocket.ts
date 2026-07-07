/**
 * Frontend real-time WebSocket server.
 * The browser connects to ws://<host>/ws and receives JSON push events
 * from the MQTT broker (telemetry, device status changes, etc.).
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { onBroadcast } from "./mqtt/broker";
import { logger } from "./logger";

export function attachFrontendWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // Store so upgrade handler can differentiate paths
  (server as unknown as Record<string, unknown>).__frontendWss = wss;

  wss.on("connection", (ws: WebSocket) => {
    logger.debug("Frontend WS client connected");

    ws.send(JSON.stringify({ type: "connected", ts: Date.now() }));

    // Register listener that forwards broker events to this client
    const unsubscribe = onBroadcast((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data as string);
      }
    });

    ws.on("close", () => {
      unsubscribe();
      logger.debug("Frontend WS client disconnected");
    });

    ws.on("error", () => unsubscribe());
  });

  logger.info("Frontend WebSocket attached at ws://<host>/ws");
}
