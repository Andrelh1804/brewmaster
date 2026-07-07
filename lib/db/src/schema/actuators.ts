import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { equipmentTable } from "./equipment";

export const actuatorsTable = pgTable("actuators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  isOn: boolean("is_on").notNull().default(false),
  equipmentId: integer("equipment_id").notNull().references(() => equipmentTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActuatorSchema = createInsertSchema(actuatorsTable).omit({ id: true, createdAt: true });
export type InsertActuator = z.infer<typeof insertActuatorSchema>;
export type Actuator = typeof actuatorsTable.$inferSelect;
