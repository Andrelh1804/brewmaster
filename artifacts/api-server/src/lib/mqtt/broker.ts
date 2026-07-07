/**
 * Embedded MQTT broker (aedes v1.x) — runs inside the same Node.js process.
 * Devices connect via WebSocket at ws://<host>/mqtt (same HTTP port).
 * The frontend receives real-time pushes via a separate /ws WebSocket path.
 *
 * aedes v1.1.x dropped the `new Aedes()` constructor; use `Aedes.createBroker()`.
 */

import { Aedes } from "aedes";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { db, devicesTable, mqttMessagesTable, communicationLogsTable, telemetryTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../logger";

// ── Topic helpers ────────────────────────────────────────────────────────────

export const TOPICS = {
  status:    (id: string) => `brewmaster/${id}/status`,
  telemetry: (id: string) => `brewmaster/${id}/telemetry`,
  commands:  (id: string) => `brewmaster/${id}/commands`,
  alarms:    (id: string) => `brewmaster/${id}/alarms`,
  events:    (id: string) => `brewmaster/${id}/events`,
  firmware:  (id: string) => `brewmaster/${id}/firmware`,
  logs:      (id: string) => `brewmaster/${id}/logs`,
} as const;

/** Extract deviceId string from any brewmaster topic */
function extractDeviceId(topic: string): string | null {
  const match = topic.match(/^brewmaster\/([^/]+)\//);
  return match ? (match[1] ?? null) : null;
}

// ── Public broker state ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let broker: any = null;
let startTime = Date.now();
let totalMessages = 0;
let uplinkMessages = 0;
let downlinkMessages = 0;
const connectedClients = new Set<string>();

// Listeners registered by WebSocket broadcast helpers
const wsListeners: Array<(data: unknown) => void> = [];

// ── WebSocket broadcast to frontend ─────────────────────────────────────────

function broadcast(data: unknown): void {
  const json = JSON.stringify(data);
  for (const cb of wsListeners) {
    try { cb(json); } catch { /* ok */ }
  }
}

export function onBroadcast(cb: (data: unknown) => void): () => void {
  wsListeners.push(cb);
  return () => {
    const idx = wsListeners.indexOf(cb);
    if (idx !== -1) wsListeners.splice(idx, 1);
  };
}

// ── Telemetry ingestion ──────────────────────────────────────────────────────

async function handleTelemetry(deviceIdentifier: string, payloadStr: string): Promise<void> {
  try {
    const data = JSON.parse(payloadStr);
    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.deviceId, deviceIdentifier));
    if (!device) return;

    await db.insert(telemetryTable).values({
      deviceId:         device.id,
      temperature:      data.temperature      ?? null,
      pressure:         data.pressure         ?? null,
      ph:               data.ph               ?? null,
      flow:             data.flow             ?? null,
      volume:           data.volume           ?? null,
      density:          data.density          ?? null,
      pumpState:        data.pump_state       ?? null,
      valveState:       data.valve_state      ?? null,
      resistanceState:  data.resistance_state ?? null,
      rssi:             data.rssi             ?? null,
      heap:             data.heap             ?? null,
      uptime:           data.uptime           ?? null,
    });

    // Update device fields from telemetry
    const updates: Record<string, unknown> = { lastHeartbeat: new Date() };
    if (data.rssi   !== undefined) updates.rssi   = data.rssi;
    if (data.uptime !== undefined) updates.uptime = data.uptime;
    if (data.firmwareVersion !== undefined) updates.firmwareVersion = data.firmwareVersion;
    await db.update(devicesTable).set(updates).where(eq(devicesTable.id, device.id));

    broadcast({ type: "telemetry", deviceId: deviceIdentifier, data });
  } catch { /* malformed payload */ }
}

// ── Broker event wiring ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wireEvents(b: any): void {
  b.on("client", async (client: { id: string }) => {
    connectedClients.add(client.id);
    logger.info({ clientId: client.id }, "MQTT client connected");
    try {
      await db.update(devicesTable)
        .set({ status: "online", lastHeartbeat: new Date() })
        .where(eq(devicesTable.deviceId, client.id));
      await db.insert(communicationLogsTable).values({
        deviceIdentifier: client.id,
        event: "connected",
        details: "MQTT client connected",
      });
    } catch { /* device may not exist yet */ }
    broadcast({ type: "device_connected", deviceId: client.id });
  });

  b.on("clientDisconnect", async (client: { id: string }) => {
    connectedClients.delete(client.id);
    logger.info({ clientId: client.id }, "MQTT client disconnected");
    try {
      await db.update(devicesTable)
        .set({ status: "offline" })
        .where(eq(devicesTable.deviceId, client.id));
      await db.insert(communicationLogsTable).values({
        deviceIdentifier: client.id,
        event: "disconnected",
        details: "MQTT client disconnected",
      });
    } catch { /* ok */ }
    broadcast({ type: "device_disconnected", deviceId: client.id });
  });

  b.on("publish", async (packet: { topic: string; payload: Buffer; qos: number }, client: { id: string } | null) => {
    if (!client) return; // internal broker publish — skip
    const topic = packet.topic;
    if (topic.startsWith("$SYS")) return;

    const deviceIdStr = extractDeviceId(topic) ?? client.id;
    const payloadStr  = packet.payload?.toString("utf8") ?? "";

    totalMessages++;
    uplinkMessages++;

    try {
      await db.insert(mqttMessagesTable).values({
        deviceId: deviceIdStr,
        topic,
        payload:   payloadStr,
        direction: "inbound",
        qos:       packet.qos ?? 0,
      });
    } catch { /* ok */ }

    if (topic.includes("/telemetry")) {
      await handleTelemetry(deviceIdStr, payloadStr);
    }

    try {
      await db.update(devicesTable)
        .set({ uplinkCount: sql`${devicesTable.uplinkCount} + 1`, lastHeartbeat: new Date() })
        .where(eq(devicesTable.deviceId, deviceIdStr));
    } catch { /* ok */ }

    broadcast({ type: "mqtt_message", topic, payload: payloadStr, direction: "inbound", deviceId: deviceIdStr });
  });

  b.on("subscribe", (subscriptions: Array<{ topic: string }>, client: { id: string } | null) => {
    logger.debug({ clientId: client?.id, topics: subscriptions.map((s) => s.topic) }, "MQTT subscribe");
  });
}

// ── Publish command to device ────────────────────────────────────────────────

export function publishCommand(deviceIdentifier: string, command: string, params?: string): void {
  if (!broker) return;
  const topic   = TOPICS.commands(deviceIdentifier);
  const payload = JSON.stringify({ command, params: params ? JSON.parse(params) : undefined, ts: Date.now() });

  broker.publish(
    { cmd: "publish", topic, payload: Buffer.from(payload), qos: 1, retain: false, dup: false },
    () => {
      totalMessages++;
      downlinkMessages++;
      db.insert(mqttMessagesTable).values({
        deviceId: deviceIdentifier, topic, payload, direction: "outbound", qos: 1,
      }).catch(() => {});
    },
  );
}

// ── Broker stats (for API) ───────────────────────────────────────────────────

export function getBrokerStats() {
  return {
    running:          broker !== null,
    clientCount:      connectedClients.size,
    connectedDevices: [...connectedClients],
    totalMessages,
    uplinkMessages,
    downlinkMessages,
    uptime:           Math.floor((Date.now() - startTime) / 1000),
  };
}

// ── Server attach ────────────────────────────────────────────────────────────

/**
 * Create the aedes broker, attach its WebSocket transport (for device connections)
 * to the HTTP server's upgrade handler, and wire all domain event handlers.
 *
 * Must be called before server.listen().
 */
export async function attachMqttBroker(server: Server): Promise<void> {
  startTime = Date.now();

  // aedes v1.x async factory
  broker = await Aedes.createBroker();
  wireEvents(broker);

  const mqttWss = new WebSocketServer({ noServer: true });

  mqttWss.on("connection", (ws: WebSocket) => {
    const stream = WebSocket.createWebSocketStream(ws);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    broker.handle(stream as any);
  });

  // Stash on server so the upgrade handler (in index.ts) can route to it
  (server as unknown as Record<string, unknown>)["__mqttWss"] = mqttWss;

  logger.info("MQTT broker ready — devices connect via ws://<host>/mqtt");
}
