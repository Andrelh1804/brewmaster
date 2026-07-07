import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communicationLogsTable = pgTable("communication_logs", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id"),
  deviceIdentifier: text("device_identifier"), // the deviceId string (e.g. "ESP32-001")
  event: text("event").notNull(), // connected | disconnected | reconnected | timeout | error | ota_start | command_sent | command_ack
  details: text("details"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommunicationLogSchema = createInsertSchema(communicationLogsTable).omit({ id: true, timestamp: true });
export type InsertCommunicationLog = z.infer<typeof insertCommunicationLogSchema>;
export type CommunicationLog = typeof communicationLogsTable.$inferSelect;
