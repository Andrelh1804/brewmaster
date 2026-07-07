import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, actuatorsTable, equipmentTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  CreateActuatorBody,
  ToggleActuatorParams,
  ListActuatorsResponse,
  CreateActuatorResponse,
  ToggleActuatorResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/actuators", async (_req, res): Promise<void> => {
  const actuators = await db
    .select({
      id: actuatorsTable.id,
      name: actuatorsTable.name,
      type: actuatorsTable.type,
      isOn: actuatorsTable.isOn,
      equipmentId: actuatorsTable.equipmentId,
      equipmentName: equipmentTable.name,
      notes: actuatorsTable.notes,
      createdAt: actuatorsTable.createdAt,
    })
    .from(actuatorsTable)
    .leftJoin(equipmentTable, eq(actuatorsTable.equipmentId, equipmentTable.id))
    .orderBy(actuatorsTable.createdAt);
  res.json(ListActuatorsResponse.parse(toJSON(actuators)));
});

router.post("/actuators", async (req, res): Promise<void> => {
  const parsed = CreateActuatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [actuator] = await db.insert(actuatorsTable).values(parsed.data).returning();
  const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, actuator.equipmentId));
  res.status(201).json(CreateActuatorResponse.parse({ ...actuator, equipmentName: equipment?.name ?? null }));
});

router.post("/actuators/:id/toggle", async (req, res): Promise<void> => {
  const params = ToggleActuatorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(actuatorsTable).where(eq(actuatorsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Actuator not found" });
    return;
  }
  const [actuator] = await db.update(actuatorsTable).set({ isOn: !existing.isOn }).where(eq(actuatorsTable.id, params.data.id)).returning();
  const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, actuator!.equipmentId));
  res.json(ToggleActuatorResponse.parse({ ...actuator, equipmentName: equipment?.name ?? null }));
});

export default router;
