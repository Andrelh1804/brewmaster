import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deviceCommandsTable = pgTable("device_commands", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  command: text("command").notNull(),
  params: text("params"), // JSON string
  status: text("status").notNull().default("pending"), // pending | sent | acknowledged | failed | timeout
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  response: text("response"), // JSON string
  error: text("error"),
});

export const insertDeviceCommandSchema = createInsertSchema(deviceCommandsTable).omit({ id: true, sentAt: true });
export type InsertDeviceCommand = z.infer<typeof insertDeviceCommandSchema>;
export type DeviceCommand = typeof deviceCommandsTable.$inferSelect;
