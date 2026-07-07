import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, productionsTable, recipesTable, equipmentTable, sensorsTable, alarmsTable, eventsTable } from "@workspace/db";
import {
  GetDashboardOverviewResponse,
  GetDashboardSensorSummaryResponse,
  GetDashboardRecentEventsResponse,
} from "@workspace/api-zod";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

router.get("/dashboard/overview", async (_req, res): Promise<void> => {
  const [activeProduction] = await db
    .select()
    .from(productionsTable)
    .where(eq(productionsTable.status, "running"))
    .orderBy(desc(productionsTable.createdAt))
    .limit(1);

  let activeProdEnriched = null;
  if (activeProduction) {
    const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, activeProduction.recipeId));
    activeProdEnriched = { ...activeProduction, recipeName: recipe?.name ?? "Unknown" };
  }

  const allEquipment = await db.select().from(equipmentTable);
  const connectedEquipment = allEquipment.filter((e) => e.connected).length;

  const activeAlarms = await db
    .select()
    .from(alarmsTable)
    .where(eq(alarmsTable.acknowledged, false));

  const allRecipes = await db.select().from(recipesTable);

  const lastCompleted = await db
    .select()
    .from(productionsTable)
    .where(eq(productionsTable.status, "completed"))
    .orderBy(desc(productionsTable.completedAt))
    .limit(1);

  const overview = {
    activeProduction: activeProdEnriched,
    connectedEquipment,
    totalEquipment: allEquipment.length,
    activeAlarms: activeAlarms.length,
    totalRecipes: allRecipes.length,
    lastProduction: lastCompleted[0]?.completedAt?.toISOString() ?? null,
    iotStatus: "simulated",
  };

  res.json(GetDashboardOverviewResponse.parse(toJSON(overview)));
});

router.get("/dashboard/sensor-summary", async (_req, res): Promise<void> => {
  const sensors = await db.select().from(sensorsTable).orderBy(sensorsTable.id);
  const summary = sensors.map((s) => ({
    sensorId: s.id,
    sensorName: s.name,
    type: s.type,
    unit: s.unit,
    value: s.currentValue,
    status: s.status,
    timestamp: new Date().toISOString(),
  }));
  res.json(GetDashboardSensorSummaryResponse.parse(toJSON(summary)));
});

router.get("/dashboard/recent-events", async (_req, res): Promise<void> => {
  const events = await db
    .select()
    .from(eventsTable)
    .orderBy(desc(eventsTable.createdAt))
    .limit(20);
  res.json(GetDashboardRecentEventsResponse.parse(toJSON(events)));
});

export default router;
