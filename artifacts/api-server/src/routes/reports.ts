import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, productionsTable, sensorsTable, sensorReadingsTable, alarmsTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  GetProductionReportResponse,
  GetSensorHistoryReportResponse,
  GetAlarmReportResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/production-summary", async (_req, res): Promise<void> => {
  const all = await db.select().from(productionsTable);
  const completed = all.filter((p) => p.status === "completed");
  const cancelled = all.filter((p) => p.status === "cancelled");

  const durations = completed
    .filter((p) => p.completedAt && p.startedAt)
    .map((p) => (p.completedAt!.getTime() - p.startedAt.getTime()) / 3600000);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const stages = ["mashing", "boiling", "whirlpool", "cooling", "fermentation", "maturation", "cip", "done"];
  const byStage = stages.map((stage) => ({
    stage,
    count: all.filter((p) => p.currentStage === stage).length,
  }));

  res.json(GetProductionReportResponse.parse({
    totalRuns: all.length,
    completedRuns: completed.length,
    cancelledRuns: cancelled.length,
    avgDurationHours: Math.round(avgDuration * 10) / 10,
    byStage,
  }));
});

router.get("/reports/sensor-history", async (_req, res): Promise<void> => {
  const sensors = await db.select().from(sensorsTable).limit(6);
  const series = await Promise.all(
    sensors.map(async (sensor) => {
      const readings = await db
        .select()
        .from(sensorReadingsTable)
        .where(eq(sensorReadingsTable.sensorId, sensor.id))
        .orderBy(desc(sensorReadingsTable.timestamp))
        .limit(50);

      return {
        sensorId: sensor.id,
        sensorName: sensor.name,
        type: sensor.type,
        unit: sensor.unit,
        readings: readings.map((r) => ({
          sensorId: r.sensorId,
          sensorName: sensor.name,
          type: sensor.type,
          unit: sensor.unit,
          value: r.value,
          status: r.status,
          timestamp: r.timestamp.toISOString(),
        })),
      };
    }),
  );
  res.json(GetSensorHistoryReportResponse.parse(toJSON(series)));
});

router.get("/reports/alarm-summary", async (_req, res): Promise<void> => {
  const all = await db.select().from(alarmsTable);
  const acked = all.filter((a) => a.acknowledged);
  const severities = ["info", "warning", "error", "emergency"];
  const bySeverity = severities.map((severity) => ({
    severity,
    count: all.filter((a) => a.severity === severity).length,
  }));
  res.json(GetAlarmReportResponse.parse({
    total: all.length,
    acknowledged: acked.length,
    unacknowledged: all.length - acked.length,
    bySeverity,
  }));
});

export default router;
