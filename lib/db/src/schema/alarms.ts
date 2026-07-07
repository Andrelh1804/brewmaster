import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alarmsTable = pgTable("alarms", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("medium"),
  severity: text("severity").notNull().default("warning"),
  acknowledged: boolean("acknowledged").notNull().default(false),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  equipmentId: integer("equipment_id"),
  sensorId: integer("sensor_id"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlarmSchema = createInsertSchema(alarmsTable).omit({ id: true, createdAt: true });
export type InsertAlarm = z.infer<typeof insertAlarmSchema>;
export type Alarm = typeof alarmsTable.$inferSelect;
