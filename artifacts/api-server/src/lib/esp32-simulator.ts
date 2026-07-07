/**
 * ESP32 MQTT Simulator
 *
 * Creates virtual ESP32 devices that publish realistic telemetry over MQTT.
 * Each simulated device connects to the embedded aedes broker as a real MQTT client,
 * exercises the full topic structure, and can simulate alarms, reconnections, and faults.
 */

import mqtt from "mqtt";
import { db, devicesTable } from "@workspace/db";
import { logger } from "./logger";

// ── Types ────────────────────────────────────────────────────────────────────

interface SimDevice {
  deviceId: string;
  name:     string;
  client:   ReturnType<typeof mqtt.connect> | null;
  state:    DeviceState;
}

interface DeviceState {
  temperature:       number;
  pressure:          number;
  ph:                number;
  flow:              number;
  volume:            number;
  density:           number;
  pump_state:        boolean;
  valve_state:       boolean;
  resistance_state:  boolean;
  rssi:              number;
  heap:              number;
  uptime:            number;
  tickCount:         number;
}

// ── State ────────────────────────────────────────────────────────────────────

let running = false;
let tickIntervalMs = 5000;
let totalTicks = 0;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
const devices: Map<string, SimDevice> = new Map();

// ── Value simulation ─────────────────────────────────────────────────────────

function noise(magnitude: number): number {
  return (Math.random() - 0.5) * 2 * magnitude;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function simulateState(s: DeviceState): DeviceState {
  const next = { ...s };
  next.temperature      = clamp(s.temperature      + noise(0.4),  15, 105);
  next.pressure         = clamp(s.pressure         + noise(0.03),  0,   5);
  next.ph               = clamp(s.ph               + noise(0.02),  3,   8);
  next.flow             = clamp(s.flow             + noise(1.5),   0, 100);
  next.volume           = clamp(s.volume           + noise(0.5),   0, 1000);
  next.density          = clamp(s.density          + noise(0.001), 0.990, 1.120);
  next.rssi             = clamp(s.rssi             + noise(2),    -90, -30);
  next.heap             = clamp(s.heap             + noise(2000), 100000, 300000);
  next.uptime           = s.uptime + Math.floor(tickIntervalMs / 1000);
  next.tickCount        = s.tickCount + 1;

  // Occasionally toggle actuators
  if (Math.random() < 0.05) next.pump_state       = !s.pump_state;
  if (Math.random() < 0.03) next.valve_state      = !s.valve_state;
  if (Math.random() < 0.04) next.resistance_state = !s.resistance_state;

  return next;
}

function initialState(): DeviceState {
  return {
    temperature:      20 + Math.random() * 20,
    pressure:         1 + Math.random() * 0.5,
    ph:               4.5 + Math.random() * 1.5,
    flow:             20 + Math.random() * 30,
    volume:           100 + Math.random() * 200,
    density:          1.040 + Math.random() * 0.030,
    pump_state:       Math.random() > 0.5,
    valve_state:      Math.random() > 0.5,
    resistance_state: Math.random() > 0.5,
    rssi:             -60 - Math.random() * 20,
    heap:             200000 + Math.random() * 80000,
    uptime:           0,
    tickCount:        0,
  };
}

// ── Connect a device to the broker ──────────────────────────────────────────

function connectDevice(dev: SimDevice): void {
  // Connect to the embedded broker via WebSocket transport (same host)
  const brokerUrl = `ws://localhost:${process.env["PORT"] ?? 8080}/mqtt`;

  const client = mqtt.connect(brokerUrl, {
    clientId:    dev.deviceId,
    clean:       true,
    reconnectPeriod: 3000,
    connectTimeout: 5000,
  });

  client.on("connect", () => {
    logger.debug({ deviceId: dev.deviceId }, "Simulator device connected to broker");
    // Subscribe to commands
    client.subscribe(`brewmaster/${dev.deviceId}/commands`, { qos: 1 });
    // Publish initial status
    client.publish(
      `brewmaster/${dev.deviceId}/status`,
      JSON.stringify({ status: "online", name: dev.name, ts: Date.now() }),
      { qos: 0 },
    );
  });

  client.on("message", (topic: string, payload: Buffer) => {
    try {
      const msg = JSON.parse(payload.toString());
      logger.debug({ deviceId: dev.deviceId, command: msg.command }, "Simulator received command");
    } catch { /* ok */ }
  });

  client.on("error", (err: Error) => {
    logger.warn({ deviceId: dev.deviceId, err: err.message }, "Simulator MQTT error");
  });

  dev.client = client;
}

// ── Tick: publish telemetry for all simulated devices ────────────────────────

function tick(): void {
  totalTicks++;

  for (const [, dev] of devices) {
    dev.state = simulateState(dev.state);

    const telemetry = {
      temperature:       Math.round(dev.state.temperature * 100) / 100,
      pressure:          Math.round(dev.state.pressure * 1000) / 1000,
      ph:                Math.round(dev.state.ph * 100) / 100,
      flow:              Math.round(dev.state.flow * 10) / 10,
      volume:            Math.round(dev.state.volume * 10) / 10,
      density:           Math.round(dev.state.density * 10000) / 10000,
      pump_state:        dev.state.pump_state,
      valve_state:       dev.state.valve_state,
      resistance_state:  dev.state.resistance_state,
      rssi:              Math.round(dev.state.rssi),
      heap:              Math.round(dev.state.heap),
      uptime:            dev.state.uptime,
      ts:                Date.now(),
    };

    if (dev.client?.connected) {
      dev.client.publish(
        `brewmaster/${dev.deviceId}/telemetry`,
        JSON.stringify(telemetry),
        { qos: 0 },
      );

      // Occasional alarm
      if (dev.state.temperature > 95 || dev.state.ph < 3.5 || dev.state.ph > 7.5) {
        dev.client.publish(
          `brewmaster/${dev.deviceId}/alarms`,
          JSON.stringify({
            type:    dev.state.temperature > 95 ? "high_temperature" : "ph_out_of_range",
            value:   dev.state.temperature > 95 ? dev.state.temperature : dev.state.ph,
            ts:      Date.now(),
          }),
          { qos: 1 },
        );
      }
    }
  }
}

// ── Load registered devices from DB ──────────────────────────────────────────

async function loadDevices(): Promise<void> {
  const dbDevices = await db.select().from(devicesTable).limit(20);
  for (const d of dbDevices) {
    if (!devices.has(d.deviceId)) {
      const simDev: SimDevice = {
        deviceId: d.deviceId,
        name:     d.name,
        client:   null,
        state:    initialState(),
      };
      devices.set(d.deviceId, simDev);
      connectDevice(simDev);
    }
  }

  // If no devices registered, create a default one
  if (devices.size === 0) {
    const simDev: SimDevice = {
      deviceId: "SIM-001",
      name:     "Simulador ESP32 #1",
      client:   null,
      state:    initialState(),
    };
    devices.set("SIM-001", simDev);
    connectDevice(simDev);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function startSimulator(config?: { tickIntervalMs?: number; deviceIds?: string[] }): Promise<void> {
  if (running) return;

  if (config?.tickIntervalMs) tickIntervalMs = config.tickIntervalMs;

  await loadDevices();

  running = true;
  intervalHandle = setInterval(tick, tickIntervalMs);
  logger.info({ deviceCount: devices.size, tickIntervalMs }, "ESP32 simulator started");
}

export function stopSimulator(): void {
  if (!running) return;

  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }

  for (const [, dev] of devices) {
    if (dev.client) {
      dev.client.publish(
        `brewmaster/${dev.deviceId}/status`,
        JSON.stringify({ status: "offline", ts: Date.now() }),
        { qos: 0 },
      );
      dev.client.end(true);
      dev.client = null;
    }
  }

  devices.clear();
  running = false;
  logger.info("ESP32 simulator stopped");
}

export function configureSimulator(config: { tickIntervalMs?: number }): void {
  if (config.tickIntervalMs) {
    tickIntervalMs = config.tickIntervalMs;
    if (running && intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = setInterval(tick, tickIntervalMs);
    }
  }
}

export function getSimulatorStatus() {
  return {
    running,
    deviceCount: devices.size,
    tickIntervalMs,
    totalTicks,
    devices: [...devices.values()].map((d) => ({
      deviceId: d.deviceId,
      name:     d.name,
      status:   d.client?.connected ? "connected" : "disconnected",
    })),
  };
}
