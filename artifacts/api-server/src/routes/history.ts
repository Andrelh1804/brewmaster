import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { ListHistoryResponse } from "@workspace/api-zod";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

router.get("/history", async (_req, res): Promise<void> => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.createdAt)).limit(200);
  res.json(ListHistoryResponse.parse(toJSON(events)));
});

export default router;
