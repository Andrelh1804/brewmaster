import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, aiMessagesTable, productionsTable, recipesTable, sensorsTable, alarmsTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import {
  AiChatBody,
  AiDiagnoseBody,
  AiChatResponse,
  AiDiagnoseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const BREWING_RESPONSES = [
  "Based on the current fermentation temperature profile, I recommend increasing the pitch rate by 10% to achieve better attenuation. The current gravity readings suggest the yeast is under stress.",
  "The mash temperature is within optimal range for this recipe. Your efficiency should be around 75-78%. Consider a 15-minute protein rest if you notice haze issues in the final product.",
  "Your CO2 pressure readings indicate the fermentation is progressing well. Expected terminal gravity should be reached in approximately 48 hours at the current rate.",
  "The pH level in the mash tun is slightly above optimal range for this enzyme activity window. Consider adding a small amount of lactic acid to bring it to 5.2-5.4.",
  "Sensor data indicates the heat exchanger efficiency has dropped by 8% compared to the baseline. Schedule a CIP cycle after this production to maintain performance.",
  "Based on historical data from similar recipes, your hop utilization is tracking at 92% of expected IBU contribution. The current boil vigor looks adequate.",
  "Water profile analysis suggests your sulfate-to-chloride ratio favors hop character. This is ideal for the IPA style you are brewing. The malt backbone may benefit from a slight chloride increase next batch.",
  "Fermentation data looks excellent. Diacetyl rest recommended at 18°C for 24 hours starting tomorrow. Current VDK precursor levels should be reduced adequately before packaging.",
];

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Store user message
  await db.insert(aiMessagesTable).values({
    role: "user",
    content: parsed.data.message,
  });

  // Simulated AI response
  const responseContent = BREWING_RESPONSES[Math.floor(Math.random() * BREWING_RESPONSES.length)]!;

  const [assistantMsg] = await db.insert(aiMessagesTable).values({
    role: "assistant",
    content: responseContent,
  }).returning();

  res.json(AiChatResponse.parse(toJSON(assistantMsg)));
});

router.post("/ai/diagnose", async (req, res): Promise<void> => {
  const parsed = AiDiagnoseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [production] = await db.select().from(productionsTable).where(eq(productionsTable.id, parsed.data.productionId));
  if (!production) {
    res.status(404).json({ error: "Production not found" });
    return;
  }

  const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, production.recipeId));
  const activeAlarms = await db.select().from(alarmsTable).where(eq(alarmsTable.acknowledged, false));
  const sensors = await db.select().from(sensorsTable).limit(10);

  const warnings = activeAlarms.map((a) => `Active alarm: ${a.message} (${a.severity})`);

  const criticalSensors = sensors.filter((s) => s.status === "critical");
  if (criticalSensors.length > 0) {
    warnings.push(...criticalSensors.map((s) => `Critical sensor reading: ${s.name} at ${s.currentValue} ${s.unit}`));
  }

  res.json(AiDiagnoseResponse.parse({
    diagnosis: `Production of "${recipe?.name ?? "Unknown"}" is currently in the ${production.currentStage} stage. All primary parameters are within acceptable ranges. Fermentation kinetics indicate healthy yeast activity.`,
    suggestions: [
      "Monitor the mash temperature for the next 15 minutes to ensure enzymatic conversion is complete.",
      "Pre-cool the wort chiller water to improve heat exchange efficiency.",
      `Prepare yeast pitch at ${recipe?.yeasts ?? "recommended"} rate for optimal fermentation.`,
      "Verify CO2 trap activity matches expected fermentation rate curve.",
    ],
    confidence: Math.round((0.82 + Math.random() * 0.15) * 100) / 100,
    warnings,
  }));
});

export default router;
