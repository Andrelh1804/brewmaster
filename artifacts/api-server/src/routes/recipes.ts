import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, recipesTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  CreateRecipeBody,
  UpdateRecipeBody,
  GetRecipeParams,
  UpdateRecipeParams,
  DeleteRecipeParams,
  ListRecipesResponse,
  GetRecipeResponse,
  CreateRecipeResponse,
  UpdateRecipeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/recipes", async (_req, res): Promise<void> => {
  const recipes = await db.select().from(recipesTable).orderBy(recipesTable.createdAt);
  res.json(ListRecipesResponse.parse(toJSON(recipes)));
});

router.post("/recipes", async (req, res): Promise<void> => {
  const parsed = CreateRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [recipe] = await db.insert(recipesTable).values(parsed.data).returning();
  res.status(201).json(CreateRecipeResponse.parse(toJSON(recipe)));
});

router.get("/recipes/:id", async (req, res): Promise<void> => {
  const params = GetRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, params.data.id));
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.json(GetRecipeResponse.parse(toJSON(recipe)));
});

router.patch("/recipes/:id", async (req, res): Promise<void> => {
  const params = UpdateRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [recipe] = await db.update(recipesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(recipesTable.id, params.data.id)).returning();
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.json(UpdateRecipeResponse.parse(toJSON(recipe)));
});

router.delete("/recipes/:id", async (req, res): Promise<void> => {
  const params = DeleteRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [recipe] = await db.delete(recipesTable).where(eq(recipesTable.id, params.data.id)).returning();
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/recipes/:id/duplicate", async (req, res): Promise<void> => {
  const params = GetRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [original] = await db.select().from(recipesTable).where(eq(recipesTable.id, params.data.id));
  if (!original) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  const { id, createdAt, updatedAt, ...rest } = original;
  const [duplicate] = await db.insert(recipesTable).values({
    ...rest,
    name: `${original.name} (Cópia)`,
  }).returning();
  res.status(201).json(CreateRecipeResponse.parse(toJSON(duplicate)));
});

export default router;
