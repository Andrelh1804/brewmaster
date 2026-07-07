import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deviceGroupsTable = pgTable("device_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  plant: text("plant"),
  sector: text("sector"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeviceGroupSchema = createInsertSchema(deviceGroupsTable).omit({ id: true, createdAt: true });
export type InsertDeviceGroup = z.infer<typeof insertDeviceGroupSchema>;
export type DeviceGroup = typeof deviceGroupsTable.$inferSelect;
