import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { equipmentTable } from "./equipment";

export const sensorsTable = pgTable("sensors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  unit: text("unit").notNull(),
  currentValue: real("current_value").notNull().default(0),
  minThreshold: real("min_threshold"),
  maxThreshold: real("max_threshold"),
  status: text("status").notNull().default("normal"),
  equipmentId: integer("equipment_id").notNull().references(() => equipmentTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sensorReadingsTable = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  sensorId: integer("sensor_id").notNull().references(() => sensorsTable.id),
  value: real("value").notNull(),
  status: text("status").notNull().default("normal"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSensorSchema = createInsertSchema(sensorsTable).omit({ id: true, createdAt: true });
export type InsertSensor = z.infer<typeof insertSensorSchema>;
export type Sensor = typeof sensorsTable.$inferSelect;
export type SensorReading = typeof sensorReadingsTable.$inferSelect;
