import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  style: text("style").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  // Brewing parameters
  ibu: real("ibu"),
  og: real("og"),
  fg: real("fg"),
  abv: real("abv"),
  srm: real("srm"),
  batchSizeL: real("batch_size_l"),
  // Financial
  estimatedCost: real("estimated_cost"),
  suggestedPrice: real("suggested_price"),
  profitMargin: real("profit_margin"),
  // Ingredients
  malts: text("malts"),
  hops: text("hops"),
  yeasts: text("yeasts"),
  adjuncts: text("adjuncts"),
  salts: text("salts"),
  waterProfile: text("water_profile"),
  // Profiles
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
