import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const otaJobsTable = pgTable("ota_jobs", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  firmwareVersionId: integer("firmware_version_id"),
  targetVersion: text("target_version").notNull(),
  status: text("status").notNull().default("pending"), // pending | downloading | installing | completed | failed | cancelled
  progress: integer("progress").notNull().default(0),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOtaJobSchema = createInsertSchema(otaJobsTable).omit({ id: true, createdAt: true, startedAt: true });
export type InsertOtaJob = z.infer<typeof insertOtaJobSchema>;
export type OtaJob = typeof otaJobsTable.$inferSelect;
