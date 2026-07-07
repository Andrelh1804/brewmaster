import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, telemetryTable, devicesTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

router.get("/devices/:id/telemetry", async (req, res): Promise<void> => {
  const deviceId = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(deviceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rawLimit = parseInt(String(req.query["limit"] ?? "100"), 10);
  const limit = isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;

  try {
    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
    if (!device) { res.status(404).json({ error: "Device not found" }); return; }

    const rows = await db
      .select()
      .from(telemetryTable)
      .where(eq(telemetryTable.deviceId, deviceId))
      .orderBy(desc(telemetryTable.timestamp))
      .limit(limit);

    res.json(toJSON(rows));
  } catch {
    res.status(500).json({ error: "Failed to fetch telemetry" });
  }
});

export default router;
