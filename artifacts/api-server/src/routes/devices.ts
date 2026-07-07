import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  ListDevicesResponse,
  GetDeviceResponse,
  CreateDeviceResponse,
  UpdateDeviceResponse,
  CreateDeviceBody,
  UpdateDeviceBody,
  GetDeviceParams,
  UpdateDeviceParams,
  DeleteDeviceParams,
  DeviceHeartbeatParams,
  DeviceHeartbeatBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/devices", async (_req, res): Promise<void> => {
  const devices = await db.select().from(devicesTable).orderBy(devicesTable.createdAt);
  res.json(ListDevicesResponse.parse(toJSON(devices)));
});

router.post("/devices", async (req, res): Promise<void> => {
  const parsed = CreateDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [device] = await db.insert(devicesTable).values({
    ...parsed.data,
    status: "offline",
  }).returning();
  res.status(201).json(CreateDeviceResponse.parse(toJSON(device)));
});

router.get("/devices/:id", async (req, res): Promise<void> => {
  const params = GetDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, params.data.id));
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  res.json(GetDeviceResponse.parse(toJSON(device)));
});

router.patch("/devices/:id", async (req, res): Promise<void> => {
  const params = UpdateDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [device] = await db.update(devicesTable)
    .set(parsed.data)
    .where(eq(devicesTable.id, params.data.id))
    .returning();
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  res.json(UpdateDeviceResponse.parse(toJSON(device)));
});

router.delete("/devices/:id", async (req, res): Promise<void> => {
  const params = DeleteDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(devicesTable).where(eq(devicesTable.id, params.data.id));
  res.status(204).send();
});

router.post("/devices/:id/heartbeat", async (req, res): Promise<void> => {
  const params = DeviceHeartbeatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = DeviceHeartbeatBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {
    status: "online",
    lastHeartbeat: new Date(),
  };
  if (body.data.ipAddress) updateData.ipAddress = body.data.ipAddress;
  if (body.data.firmwareVersion) updateData.firmwareVersion = body.data.firmwareVersion;
  if (body.data.rssi !== undefined) updateData.rssi = body.data.rssi;
  const [device] = await db.update(devicesTable)
    .set(updateData)
    .where(eq(devicesTable.id, params.data.id))
    .returning();
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  res.json(GetDeviceResponse.parse(toJSON(device)));
});

export default router;
