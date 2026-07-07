import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, otaJobsTable, devicesTable, firmwareVersionsTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import { publishCommand } from "../lib/mqtt/broker";

const router: IRouter = Router();

router.get("/ota", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(otaJobsTable).orderBy(desc(otaJobsTable.startedAt));
    res.json(toJSON(rows));
  } catch {
    res.status(500).json({ error: "Failed to fetch OTA jobs" });
  }
});

router.post("/devices/:id/ota", async (req, res): Promise<void> => {
  const deviceId = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(deviceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { targetVersion, firmwareVersionId } = req.body as { targetVersion?: unknown; firmwareVersionId?: unknown };
  if (!targetVersion || typeof targetVersion !== "string") {
    res.status(400).json({ error: "targetVersion is required" });
    return;
  }

  const fwId = firmwareVersionId !== undefined ? parseInt(String(firmwareVersionId), 10) : undefined;
  const fwIdVal = fwId !== undefined && isFinite(fwId) ? fwId : undefined;

  try {
    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
    if (!device) { res.status(404).json({ error: "Device not found" }); return; }

    const [job] = await db.insert(otaJobsTable).values({
      deviceId,
      firmwareVersionId: fwIdVal ?? null,
      targetVersion,
      status: "pending",
      progress: 0,
    }).returning();

    let fwUrl: string | undefined;
    if (fwIdVal) {
      try {
        const [fw] = await db.select().from(firmwareVersionsTable).where(eq(firmwareVersionsTable.id, fwIdVal));
        fwUrl = fw?.url ?? undefined;
      } catch { /* ok */ }
    }

    try {
      publishCommand(device.deviceId, "ota_update", JSON.stringify({ version: targetVersion, url: fwUrl }));
    } catch { /* device may be offline */ }

    res.status(201).json(toJSON(job));
  } catch {
    res.status(500).json({ error: "Failed to trigger OTA update" });
  }
});

router.get("/ota/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [job] = await db.select().from(otaJobsTable).where(eq(otaJobsTable.id, id));
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    res.json(toJSON(job));
  } catch {
    res.status(500).json({ error: "Failed to fetch OTA job" });
  }
});

router.post("/ota/:id/cancel", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [job] = await db.update(otaJobsTable)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(eq(otaJobsTable.id, id))
      .returning();
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    res.json(toJSON(job));
  } catch {
    res.status(500).json({ error: "Failed to cancel OTA job" });
  }
});

export default router;
