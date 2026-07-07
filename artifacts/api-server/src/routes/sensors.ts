import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, sensorsTable, sensorReadingsTable, equipmentTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  CreateSensorBody,
  UpdateSensorBody,
  GetSensorParams,
  UpdateSensorParams,
  DeleteSensorParams,
  GetSensorReadingsParams,
  ListSensorsResponse,
  GetSensorResponse,
  CreateSensorResponse,
  UpdateSensorResponse,
  GetSensorReadingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sensors", async (_req, res): Promise<void> => {
  const sensors = await db
    .select({
      id: sensorsTable.id,
      name: sensorsTable.name,
      type: sensorsTable.type,
      unit: sensorsTable.unit,
      currentValue: sensorsTable.currentValue,
      minThreshold: sensorsTable.minThreshold,
      maxThreshold: sensorsTable.maxThreshold,
      equipmentId: sensorsTable.equipmentId,
      equipmentName: equipmentTable.name,
      status: sensorsTable.status,
      createdAt: sensorsTable.createdAt,
    })
    .from(sensorsTable)
    .leftJoin(equipmentTable, eq(sensorsTable.equipmentId, equipmentTable.id))
    .orderBy(sensorsTable.createdAt);
  res.json(ListSensorsResponse.parse(toJSON(sensors)));
});

router.post("/sensors", async (req, res): Promise<void> => {
  const parsed = CreateSensorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sensor] = await db.insert(sensorsTable).values(parsed.data).returning();
  const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, sensor.equipmentId));
  res.status(201).json(CreateSensorResponse.parse(toJSON({ ...sensor, equipmentName: equipment?.name ?? null })));
});

router.get("/sensors/:id", async (req, res): Promise<void> => {
  const params = GetSensorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [sensor] = await db
    .select({
      id: sensorsTable.id,
      name: sensorsTable.name,
      type: sensorsTable.type,
      unit: sensorsTable.unit,
      currentValue: sensorsTable.currentValue,
      minThreshold: sensorsTable.minThreshold,
      maxThreshold: sensorsTable.maxThreshold,
      equipmentId: sensorsTable.equipmentId,
      equipmentName: equipmentTable.name,
      status: sensorsTable.status,
      createdAt: sensorsTable.createdAt,
    })
    .from(sensorsTable)
    .leftJoin(equipmentTable, eq(sensorsTable.equipmentId, equipmentTable.id))
    .where(eq(sensorsTable.id, params.data.id));
  if (!sensor) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }
  res.json(GetSensorResponse.parse(toJSON(sensor)));
});

router.patch("/sensors/:id", async (req, res): Promise<void> => {
  const params = UpdateSensorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSensorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sensor] = await db.update(sensorsTable).set(parsed.data).where(eq(sensorsTable.id, params.data.id)).returning();
  if (!sensor) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }
  const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, sensor.equipmentId));
  res.json(UpdateSensorResponse.parse(toJSON({ ...sensor, equipmentName: equipment?.name ?? null })));
});

router.delete("/sensors/:id", async (req, res): Promise<void> => {
  const params = DeleteSensorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [sensor] = await db.delete(sensorsTable).where(eq(sensorsTable.id, params.data.id)).returning();
  if (!sensor) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/sensors/:id/readings", async (req, res): Promise<void> => {
  const params = GetSensorReadingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [sensor] = await db.select().from(sensorsTable).where(eq(sensorsTable.id, params.data.id));
  if (!sensor) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }
  const readings = await db
    .select()
    .from(sensorReadingsTable)
    .where(eq(sensorReadingsTable.sensorId, params.data.id))
    .orderBy(desc(sensorReadingsTable.timestamp))
    .limit(100);

  const mapped = readings.map((r) => ({
    sensorId: r.sensorId,
    sensorName: sensor.name,
    type: sensor.type,
    unit: sensor.unit,
    value: r.value,
    status: r.status,
    timestamp: r.timestamp.toISOString(),
  }));
  res.json(GetSensorReadingsResponse.parse(toJSON(mapped)));
});

export default router;
