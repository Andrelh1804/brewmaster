import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { recipesTable } from "./recipes";

export const productionsTable = pgTable("productions", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipesTable.id),
  status: text("status").notNull().default("pending"),
  currentStage: text("current_stage").notNull().default("mashing"),
  stageStartedAt: timestamp("stage_started_at", { withTimezone: true }),
  stageElapsedMins: integer("stage_elapsed_mins"),
  stageRemainingMins: integer("stage_remaining_mins"),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductionSchema = createInsertSchema(productionsTable).omit({ id: true, createdAt: true });
export type InsertProduction = z.infer<typeof insertProductionSchema>;
export type Production = typeof productionsTable.$inferSelect;
