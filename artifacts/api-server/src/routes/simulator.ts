import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sensorsTable, sensorReadingsTable } from "@workspace/db";
import { SimulatorTickResponse } from "@workspace/api-zod";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

function simulateValue(type: string, current: number): number {
  const noise = (Math.random() - 0.5) * 0.04;
  const drift = noise * current;

  switch (type) {
    case "temperature":
      return Math.max(0, Math.min(105, current + drift + (Math.random() - 0.5) * 0.5));
    case "pressure":
      return Math.max(0, Math.min(5, current + drift + (Math.random() - 0.5) * 0.05));
    case "ph":
      return Math.max(3, Math.min(8, current + (Math.random() - 0.5) * 0.02));
    case "density":
      return Math.max(0.990, Math.min(1.120, current + (Math.random() - 0.5) * 0.001));
    case "flow":
      return Math.max(0, Math.min(100, current + (Math.random() - 0.5) * 2));
    case "level":
      return Math.max(0, Math.min(100, current + (Math.random() - 0.5) * 1));
    case "co2":
      return Math.max(0, Math.min(10, current + (Math.random() - 0.5) * 0.1));
    case "humidity":
      return Math.max(0, Math.min(100, current + (Math.random() - 0.5) * 1));
    case "voltage":
      return Math.max(200, Math.min(240, current + (Math.random() - 0.5) * 0.5));
    default:
      return current + (Math.random() - 0.5) * 0.1;
  }
}

function computeStatus(sensor: { type: string; currentValue: number; minThreshold: number | null; maxThreshold: number | null }): string {
  if (sensor.minThreshold !== null && sensor.currentValue < sensor.minThreshold) {
    return sensor.currentValue < sensor.minThreshold * 0.9 ? "critical" : "warning";
  }
  if (sensor.maxThreshold !== null && sensor.currentValue > sensor.maxThreshold) {
    return sensor.currentValue > sensor.maxThreshold * 1.1 ? "critical" : "warning";
  }
  return "normal";
}

router.post("/simulator/tick", async (_req, res): Promise<void> => {
  const sensors = await db.select().from(sensorsTable);
  const readings = [];

  for (const sensor of sensors) {
    const newValue = Math.round(simulateValue(sensor.type, sensor.currentValue) * 1000) / 1000;
    const status = computeStatus({ ...sensor, currentValue: newValue });

    await db.update(sensorsTable)
      .set({ currentValue: newValue, status })
      .where(eq(sensorsTable.id, sensor.id));

    const [reading] = await db.insert(sensorReadingsTable).values({
      sensorId: sensor.id,
      value: newValue,
      status,
    }).returning();

    readings.push({
      sensorId: sensor.id,
      sensorName: sensor.name,
      type: sensor.type,
      unit: sensor.unit,
      value: newValue,
      status,
      timestamp: reading!.timestamp.toISOString(),
    });
  }

  res.json(SimulatorTickResponse.parse(toJSON(readings)));
});

export default router;
