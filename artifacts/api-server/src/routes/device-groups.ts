import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, deviceGroupsTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

router.get("/device-groups", async (_req, res): Promise<void> => {
  try {
    const groups = await db.select().from(deviceGroupsTable).orderBy(deviceGroupsTable.createdAt);
    res.json(toJSON(groups));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch device groups" });
  }
});

router.post("/device-groups", async (req, res): Promise<void> => {
  const { name, plant, sector, description } = req.body as Record<string, string | undefined>;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [group] = await db.insert(deviceGroupsTable)
      .values({ name, plant: plant ?? null, sector: sector ?? null, description: description ?? null })
      .returning();
    res.status(201).json(toJSON(group));
  } catch (err) {
    res.status(500).json({ error: "Failed to create device group" });
  }
});

router.get("/device-groups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [group] = await db.select().from(deviceGroupsTable).where(eq(deviceGroupsTable.id, id));
    if (!group) { res.status(404).json({ error: "Not found" }); return; }
    res.json(toJSON(group));
  } catch {
    res.status(500).json({ error: "Failed to fetch device group" });
  }
});

router.patch("/device-groups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updates = req.body as Record<string, string>;
  try {
    const [group] = await db.update(deviceGroupsTable).set(updates).where(eq(deviceGroupsTable.id, id)).returning();
    if (!group) { res.status(404).json({ error: "Not found" }); return; }
    res.json(toJSON(group));
  } catch {
    res.status(500).json({ error: "Failed to update device group" });
  }
});

router.delete("/device-groups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(deviceGroupsTable).where(eq(deviceGroupsTable.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete device group" });
  }
});

export default router;
