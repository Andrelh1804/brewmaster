import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mqttMessagesTable = pgTable("mqtt_messages", {
  id: serial("id").primaryKey(),
  deviceDbId: integer("device_db_id"),
  deviceId: text("device_id"),
  topic: text("topic").notNull(),
  payload: text("payload"),
  direction: text("direction").notNull().default("inbound"), // inbound | outbound
  qos: integer("qos").notNull().default(0),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMqttMessageSchema = createInsertSchema(mqttMessagesTable).omit({ id: true, timestamp: true });
export type InsertMqttMessage = z.infer<typeof insertMqttMessageSchema>;
export type MqttMessage = typeof mqttMessagesTable.$inferSelect;
