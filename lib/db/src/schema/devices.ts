import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  deviceId: text("device_id").notNull().unique(),
  type: text("type").notNull().default("esp32"),
  ipAddress: text("ip_address"),
  firmwareVersion: text("firmware_version"),
  status: text("status").notNull().default("unknown"),
  lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }),
  rssi: integer("rssi"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({ id: true, createdAt: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
