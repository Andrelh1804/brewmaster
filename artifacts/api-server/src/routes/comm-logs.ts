import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, communicationLogsTable, devicesTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

router.get("/devices/:id/comm-logs", async (req, res): Promise<void> => {
  const deviceId = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(deviceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rawLimit = parseInt(String(req.query["limit"] ?? "100"), 10);
  const limit = isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;

  try {
    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
    if (!device) { res.status(404).json({ error: "Device not found" }); return; }

    const rows = await db
      .select()
      .from(communicationLogsTable)
      .where(eq(communicationLogsTable.deviceId, deviceId))
      .orderBy(desc(communicationLogsTable.timestamp))
      .limit(limit);

    res.json(toJSON(rows));
  } catch {
    res.status(500).json({ error: "Failed to fetch communication logs" });
  }
});

router.get("/comm-logs", async (req, res): Promise<void> => {
  const rawLimit = parseInt(String(req.query["limit"] ?? "200"), 10);
  const limit = isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 1000) : 200;

  try {
    const rows = await db
      .select()
      .from(communicationLogsTable)
      .orderBy(desc(communicationLogsTable.timestamp))
      .limit(limit);

    res.json(toJSON(rows));
  } catch {
    res.status(500).json({ error: "Failed to fetch communication logs" });
  }
});

export default router;
