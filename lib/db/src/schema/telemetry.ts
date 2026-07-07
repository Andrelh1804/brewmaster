import { pgTable, serial, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const telemetryTable = pgTable("telemetry", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  temperature: real("temperature"),
  pressure: real("pressure"),
  ph: real("ph"),
  flow: real("flow"),
  volume: real("volume"),
  density: real("density"),
  pumpState: boolean("pump_state"),
  valveState: boolean("valve_state"),
  resistanceState: boolean("resistance_state"),
  rssi: integer("rssi"),
  heap: integer("heap"),
  uptime: integer("uptime"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTelemetrySchema = createInsertSchema(telemetryTable).omit({ id: true, timestamp: true });
export type InsertTelemetry = z.infer<typeof insertTelemetrySchema>;
export type Telemetry = typeof telemetryTable.$inferSelect;
