import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, firmwareVersionsTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

router.get("/firmware", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(firmwareVersionsTable).orderBy(desc(firmwareVersionsTable.releaseDate));
    res.json(toJSON(rows));
  } catch {
    res.status(500).json({ error: "Failed to fetch firmware versions" });
  }
});

router.post("/firmware", async (req, res): Promise<void> => {
  const { version, description, url, checksum, size, stable } = req.body as Record<string, unknown>;
  if (!version || typeof version !== "string") {
    res.status(400).json({ error: "version is required" });
    return;
  }

  const sizeNum = size !== undefined ? parseInt(String(size), 10) : undefined;
  const sizeVal = sizeNum !== undefined && isFinite(sizeNum) ? sizeNum : undefined;

  try {
    const [fw] = await db.insert(firmwareVersionsTable).values({
      version,
      description: typeof description === "string" ? description : null,
      url:         typeof url         === "string" ? url         : null,
      checksum:    typeof checksum    === "string" ? checksum    : null,
      size:        sizeVal,
      stable:      stable === true || stable === "true",
    }).returning();
    res.status(201).json(toJSON(fw));
  } catch {
    res.status(500).json({ error: "Failed to create firmware version" });
  }
});

router.get("/firmware/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [fw] = await db.select().from(firmwareVersionsTable).where(eq(firmwareVersionsTable.id, id));
    if (!fw) { res.status(404).json({ error: "Not found" }); return; }
    res.json(toJSON(fw));
  } catch {
    res.status(500).json({ error: "Failed to fetch firmware version" });
  }
});

router.delete("/firmware/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(firmwareVersionsTable).where(eq(firmwareVersionsTable.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete firmware version" });
  }
});

export default router;
