import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, productionsTable, recipesTable, eventsTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  CreateProductionBody,
  AddProductionNoteBody,
  GetProductionParams,
  PauseProductionParams,
  ResumeProductionParams,
  CancelProductionParams,
  AdvanceProductionStageParams,
  AddProductionNoteParams,
  ListProductionsResponse,
  GetProductionResponse,
  CreateProductionResponse,
  PauseProductionResponse,
  ResumeProductionResponse,
  CancelProductionResponse,
  AdvanceProductionStageResponse,
  AddProductionNoteResponse,
  GetActiveProductionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const STAGES = ["mashing", "boiling", "whirlpool", "cooling", "fermentation", "maturation", "cip", "done"] as const;

async function enrichProduction(prod: typeof productionsTable.$inferSelect) {
  const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, prod.recipeId));
  return { ...prod, recipeName: recipe?.name ?? "Unknown" };
}

router.get("/productions", async (_req, res): Promise<void> => {
  const prods = await db.select().from(productionsTable).orderBy(desc(productionsTable.createdAt));
  const enriched = await Promise.all(prods.map(enrichProduction));
  res.json(ListProductionsResponse.parse(toJSON(enriched)));
});

router.post("/productions", async (req, res): Promise<void> => {
  const parsed = CreateProductionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, parsed.data.recipeId));
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  const [prod] = await db.insert(productionsTable).values({
    recipeId: parsed.data.recipeId,
    notes: parsed.data.notes ?? null,
    status: "running",
    currentStage: "mashing",
    stageStartedAt: new Date(),
    stageElapsedMins: 0,
    stageRemainingMins: 60,
    startedAt: new Date(),
  }).returning();
  await db.insert(eventsTable).values({
    type: "production_started",
    message: `Production started for recipe: ${recipe.name}`,
    productionId: prod!.id,
  });
  res.status(201).json(CreateProductionResponse.parse(toJSON({ ...prod, recipeName: recipe.name })));
});

router.get("/productions/active", async (_req, res): Promise<void> => {
  const [prod] = await db
    .select()
    .from(productionsTable)
    .where(eq(productionsTable.status, "running"))
    .orderBy(desc(productionsTable.createdAt))
    .limit(1);
  if (!prod) {
    res.status(404).json({ error: "No active production" });
    return;
  }
  const enriched = await enrichProduction(prod);
  res.json(GetActiveProductionResponse.parse(toJSON(enriched)));
});

router.get("/productions/:id", async (req, res): Promise<void> => {
  const params = GetProductionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [prod] = await db.select().from(productionsTable).where(eq(productionsTable.id, params.data.id));
  if (!prod) {
    res.status(404).json({ error: "Production not found" });
    return;
  }
  const enriched = await enrichProduction(prod);
  res.json(GetProductionResponse.parse(toJSON(enriched)));
});

router.post("/productions/:id/pause", async (req, res): Promise<void> => {
  const params = PauseProductionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [prod] = await db
    .update(productionsTable)
    .set({ status: "paused" })
    .where(eq(productionsTable.id, params.data.id))
    .returning();
  if (!prod) {
    res.status(404).json({ error: "Production not found" });
    return;
  }
  await db.insert(eventsTable).values({
    type: "production_paused",
    message: `Production #${prod.id} paused`,
    productionId: prod.id,
  });
  const enriched = await enrichProduction(prod);
  res.json(PauseProductionResponse.parse(toJSON(enriched)));
});

router.post("/productions/:id/resume", async (req, res): Promise<void> => {
  const params = ResumeProductionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [prod] = await db
    .update(productionsTable)
    .set({ status: "running" })
    .where(eq(productionsTable.id, params.data.id))
    .returning();
  if (!prod) {
    res.status(404).json({ error: "Production not found" });
    return;
  }
  await db.insert(eventsTable).values({
    type: "production_resumed",
    message: `Production #${prod.id} resumed`,
    productionId: prod.id,
  });
  const enriched = await enrichProduction(prod);
  res.json(ResumeProductionResponse.parse(toJSON(enriched)));
});

router.post("/productions/:id/cancel", async (req, res): Promise<void> => {
  const params = CancelProductionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [prod] = await db
    .update(productionsTable)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(eq(productionsTable.id, params.data.id))
    .returning();
  if (!prod) {
    res.status(404).json({ error: "Production not found" });
    return;
  }
  await db.insert(eventsTable).values({
    type: "production_cancelled",
    message: `Production #${prod.id} cancelled`,
    productionId: prod.id,
  });
  const enriched = await enrichProduction(prod);
  res.json(CancelProductionResponse.parse(toJSON(enriched)));
});

router.post("/productions/:id/next-stage", async (req, res): Promise<void> => {
  const params = AdvanceProductionStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(productionsTable).where(eq(productionsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Production not found" });
    return;
  }
  const currentIdx = STAGES.indexOf(existing.currentStage as typeof STAGES[number]);
  const nextStage = STAGES[Math.min(currentIdx + 1, STAGES.length - 1)];
  const isComplete = nextStage === "done";
  const [prod] = await db
    .update(productionsTable)
    .set({
      currentStage: nextStage,
      stageStartedAt: new Date(),
      stageElapsedMins: 0,
      stageRemainingMins: isComplete ? 0 : 60,
      status: isComplete ? "completed" : existing.status,
      completedAt: isComplete ? new Date() : null,
    })
    .where(eq(productionsTable.id, params.data.id))
    .returning();
  await db.insert(eventsTable).values({
    type: "stage_changed",
    message: `Production #${prod!.id} advanced to stage: ${nextStage}`,
    productionId: prod!.id,
  });
  const enriched = await enrichProduction(prod!);
  res.json(AdvanceProductionStageResponse.parse(toJSON(enriched)));
});

router.post("/productions/:id/notes", async (req, res): Promise<void> => {
  const params = AddProductionNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddProductionNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(productionsTable).where(eq(productionsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Production not found" });
    return;
  }
  const [event] = await db.insert(eventsTable).values({
    type: "note_added",
    message: parsed.data.message,
    productionId: params.data.id,
  }).returning();
  res.status(201).json(AddProductionNoteResponse.parse(toJSON(event)));
});

export default router;
