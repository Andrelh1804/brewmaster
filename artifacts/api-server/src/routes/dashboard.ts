import { Router, type IRouter } from "express";
import { eq, desc, gte, and } from "drizzle-orm";
import { db, productionsTable, recipesTable, equipmentTable, sensorsTable, alarmsTable, eventsTable, actuatorsTable } from "@workspace/db";
import {
  GetDashboardOverviewResponse,
  GetDashboardSensorSummaryResponse,
  GetDashboardRecentEventsResponse,
  GetIndustrialMetricsResponse,
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

router.get("/dashboard/industrial", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allEquipment, allActuators, allSensors, activeAlarms] = await Promise.all([
    db.select().from(equipmentTable),
    db.select().from(actuatorsTable),
    db.select().from(sensorsTable),
    db.select().from(alarmsTable).where(eq(alarmsTable.acknowledged, false)),
  ]);

  // Use completedAt (not createdAt) so long-running batches crossing day/month boundaries
  // are counted in the day/month they actually finished, not when they started.
  const [productionsToday, productionsMonth] = await Promise.all([
    db.select().from(productionsTable)
      .where(and(eq(productionsTable.status, "completed"), gte(productionsTable.completedAt, startOfDay))),
    db.select().from(productionsTable)
      .where(and(eq(productionsTable.status, "completed"), gte(productionsTable.completedAt, startOfMonth))),
  ]);

  // Simulate realistic industrial metrics based on equipment + sensor state
  const onActuators = allActuators.filter((a) => a.isOn).length;
  const connectedEquipment = allEquipment.filter((e) => e.connected).length;
  const voltageSensors = allSensors.filter((s) => s.type === "voltage");
  const flowSensors = allSensors.filter((s) => s.type === "flow");

  const baseLoad = connectedEquipment * 1.2;
  const actuatorLoad = onActuators * 0.8;
  const powerKW = Math.round((baseLoad + actuatorLoad + (Math.random() * 0.5)) * 10) / 10;
  const hoursToday = now.getHours() + now.getMinutes() / 60;
  const powerKWhToday = Math.round(powerKW * hoursToday * 0.85 * 10) / 10;

  const avgFlow = flowSensors.length > 0
    ? flowSensors.reduce((sum, s) => sum + s.currentValue, 0) / flowSensors.length
    : 15;
  const waterLitersPerHour = Math.round(avgFlow * connectedEquipment * 1.5 * 10) / 10;
  const waterLitersToday = Math.round(waterLitersPerHour * hoursToday);

  const gasM3Today = Math.round(powerKWhToday * 0.06 * 10) / 10;

  const criticalAlarms = activeAlarms.filter((a) => a.severity === "emergency" || a.priority === "critical").length;
  const efficiency = Math.max(60, Math.min(99, 100 - criticalAlarms * 10 - (activeAlarms.length - criticalAlarms) * 2));

  const systemHealth = criticalAlarms > 0 ? "critical" : activeAlarms.length > 3 ? "warning" : "good";

  const metrics = {
    powerKW,
    powerKWhToday,
    waterLitersPerHour,
    waterLitersToday,
    gasM3Today,
    efficiency: Math.round(efficiency),
    productionToday: productionsToday.length,
    productionMonth: productionsMonth.length,
    systemHealth,
    mqttStatus: "disconnected" as const,
    wsStatus: "disconnected" as const,
    dbStatus: "connected" as const,
    cloudStatus: "disconnected" as const,
    timestamp: now.toISOString(),
  };

  res.json(GetIndustrialMetricsResponse.parse(toJSON(metrics)));
});

export default router;
