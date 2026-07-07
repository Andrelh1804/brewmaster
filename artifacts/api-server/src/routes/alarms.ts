import { Router, type IRouter } from "express";
import { eq, isNull, or } from "drizzle-orm";
import { db, alarmsTable, equipmentTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  CreateAlarmBody,
  AcknowledgeAlarmParams,
  ListAlarmsResponse,
  ListActiveAlarmsResponse,
  CreateAlarmResponse,
  AcknowledgeAlarmResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichAlarm(alarm: typeof alarmsTable.$inferSelect) {
  let equipmentName: string | null = null;
  if (alarm.equipmentId) {
    const [eq_] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, alarm.equipmentId));
    equipmentName = eq_?.name ?? null;
  }
  return { ...alarm, equipmentName };
}

router.get("/alarms", async (_req, res): Promise<void> => {
  const alarms = await db.select().from(alarmsTable).orderBy(alarmsTable.triggeredAt);
  const enriched = await Promise.all(alarms.map(enrichAlarm));
  res.json(ListAlarmsResponse.parse(toJSON(enriched)));
});

router.get("/alarms/active", async (_req, res): Promise<void> => {
  const alarms = await db
    .select()
    .from(alarmsTable)
    .where(eq(alarmsTable.acknowledged, false))
    .orderBy(alarmsTable.triggeredAt);
  const enriched = await Promise.all(alarms.map(enrichAlarm));
  res.json(ListActiveAlarmsResponse.parse(toJSON(enriched)));
});

router.post("/alarms", async (req, res): Promise<void> => {
  const parsed = CreateAlarmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [alarm] = await db.insert(alarmsTable).values(parsed.data).returning();
  const enriched = await enrichAlarm(alarm!);
  res.status(201).json(CreateAlarmResponse.parse(toJSON(enriched)));
});

router.post("/alarms/:id/acknowledge", async (req, res): Promise<void> => {
  const params = AcknowledgeAlarmParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [alarm] = await db
    .update(alarmsTable)
    .set({ acknowledged: true, acknowledgedAt: new Date() })
    .where(eq(alarmsTable.id, params.data.id))
    .returning();
  if (!alarm) {
    res.status(404).json({ error: "Alarm not found" });
    return;
  }
  const enriched = await enrichAlarm(alarm);
  res.json(AcknowledgeAlarmResponse.parse(toJSON(enriched)));
});

export default router;
