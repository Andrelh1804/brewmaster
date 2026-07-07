import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const firmwareVersionsTable = pgTable("firmware_versions", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  description: text("description"),
  url: text("url"),
  checksum: text("checksum"),
  size: integer("size"),
  stable: boolean("stable").notNull().default(false),
  releaseDate: timestamp("release_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFirmwareVersionSchema = createInsertSchema(firmwareVersionsTable).omit({ id: true, createdAt: true, releaseDate: true });
export type InsertFirmwareVersion = z.infer<typeof insertFirmwareVersionSchema>;
export type FirmwareVersion = typeof firmwareVersionsTable.$inferSelect;
