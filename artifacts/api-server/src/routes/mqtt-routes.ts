import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, mqttMessagesTable } from "@workspace/db";
import { getBrokerStats } from "../lib/mqtt/broker";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

router.get("/mqtt/status", (_req, res): void => {
  res.json(getBrokerStats());
});

router.get("/mqtt/messages", async (req, res): Promise<void> => {
  const rawLimit = parseInt(String(req.query["limit"] ?? "100"), 10);
  const limit = isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;
  const deviceIdFilter = typeof req.query["deviceId"] === "string" ? req.query["deviceId"] : undefined;

  try {
    const rows = deviceIdFilter
      ? await db
          .select()
          .from(mqttMessagesTable)
          .where(eq(mqttMessagesTable.deviceId, deviceIdFilter))
          .orderBy(desc(mqttMessagesTable.timestamp))
          .limit(limit)
      : await db
          .select()
          .from(mqttMessagesTable)
          .orderBy(desc(mqttMessagesTable.timestamp))
          .limit(limit);

    res.json(toJSON(rows));
  } catch {
    res.status(500).json({ error: "Failed to fetch MQTT messages" });
  }
});

export default router;
