import { Router, type IRouter } from "express";
import {
  startSimulator,
  stopSimulator,
  configureSimulator,
  getSimulatorStatus,
} from "../lib/esp32-simulator";

const router: IRouter = Router();

router.post("/simulator/esp32/start", async (req, res): Promise<void> => {
  const config = req.body as { tickIntervalMs?: number; deviceIds?: string[] } | undefined;
  await startSimulator(config ?? undefined);
  res.json(getSimulatorStatus());
});

router.post("/simulator/esp32/stop", (_req, res): void => {
  stopSimulator();
  res.json(getSimulatorStatus());
});

router.get("/simulator/esp32/status", (_req, res): void => {
  res.json(getSimulatorStatus());
});

router.patch("/simulator/esp32/config", (req, res): void => {
  const config = req.body as { tickIntervalMs?: number };
  configureSimulator(config);
  res.json(getSimulatorStatus());
});

export default router;
