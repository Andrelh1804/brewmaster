import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, equipmentTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  CreateEquipmentBody,
  UpdateEquipmentBody,
  GetEquipmentParams,
  UpdateEquipmentParams,
  DeleteEquipmentParams,
  ListEquipmentResponse,
  GetEquipmentResponse,
  CreateEquipmentResponse,
  UpdateEquipmentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/equipment", async (_req, res): Promise<void> => {
  const items = await db.select().from(equipmentTable).orderBy(equipmentTable.createdAt);
  res.json(ListEquipmentResponse.parse(toJSON(items)));
});

router.post("/equipment", async (req, res): Promise<void> => {
  const parsed = CreateEquipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(equipmentTable).values({
    ...parsed.data,
    status: "operational",
    connected: true,
  }).returning();
  res.status(201).json(CreateEquipmentResponse.parse(toJSON(item)));
});

router.get("/equipment/:id", async (req, res): Promise<void> => {
  const params = GetEquipmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, params.data.id));
  if (!item) {
    res.status(404).json({ error: "Equipment not found" });
    return;
  }
  res.json(GetEquipmentResponse.parse(toJSON(item)));
});

router.patch("/equipment/:id", async (req, res): Promise<void> => {
  const params = UpdateEquipmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEquipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.update(equipmentTable).set(parsed.data).where(eq(equipmentTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Equipment not found" });
    return;
  }
  res.json(UpdateEquipmentResponse.parse(toJSON(item)));
});

router.delete("/equipment/:id", async (req, res): Promise<void> => {
  const params = DeleteEquipmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db.delete(equipmentTable).where(eq(equipmentTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Equipment not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
