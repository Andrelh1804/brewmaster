import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  style: text("style").notNull(),
  description: text("description"),
  malts: text("malts"),
  hops: text("hops"),
  yeasts: text("yeasts"),
  adjuncts: text("adjuncts"),
  waterProfile: text("water_profile"),
  mashProfile: text("mash_profile"),
  boilTimeMins: integer("boil_time_mins"),
  hopAdditions: text("hop_additions"),
  fermentationProfile: text("fermentation_profile"),
  maturationProfile: text("maturation_profile"),
  carbonation: text("carbonation"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecipeSchema = createInsertSchema(recipesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipesTable.$inferSelect;
