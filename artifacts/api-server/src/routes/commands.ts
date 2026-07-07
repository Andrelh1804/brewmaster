import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, deviceCommandsTable, devicesTable } from "@workspace/db";
import { toJSON } from "../lib/serialize";
import { publishCommand } from "../lib/mqtt/broker";

const ALLOWED_COMMANDS = new Set([
  "start_production", "pause", "resume", "cancel",
  "set_setpoint", "set_time",
  "pump_on", "pump_off",
  "valve_open", "valve_close",
  "resistance_on", "resistance_off",
  "restart", "ota_update", "sync",
]);

const router: IRouter = Router();

router.get("/devices/:id/commands", async (req, res): Promise<void> => {
  const deviceId = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(deviceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const rows = await db
      .select()
      .from(deviceCommandsTable)
      .where(eq(deviceCommandsTable.deviceId, deviceId))
      .orderBy(deviceCommandsTable.sentAt);
    res.json(toJSON(rows));
  } catch {
    res.status(500).json({ error: "Failed to fetch commands" });
  }
});

router.post("/devices/:id/commands", async (req, res): Promise<void> => {
  const deviceId = parseInt(req.params["id"] ?? "", 10);
  if (!isFinite(deviceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { command, params } = req.body as { command?: unknown; params?: unknown };
  if (!command || typeof command !== "string") {
    res.status(400).json({ error: "command is required and must be a string" });
    return;
  }
  if (!ALLOWED_COMMANDS.has(command)) {
    res.status(400).json({ error: `Unknown command: ${command}` });
    return;
  }
  const paramsStr = params !== undefined ? (typeof params === "string" ? params : JSON.stringify(params)) : null;

  try {
    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
    if (!device) { res.status(404).json({ error: "Device not found" }); return; }

    const [cmd] = await db.insert(deviceCommandsTable).values({
      deviceId,
      command,
      params: paramsStr,
      status: "sent",
    }).returning();

    try {
      publishCommand(device.deviceId, command, paramsStr ?? undefined);
    } catch { /* device may be offline — command still persisted */ }

    res.status(201).json(toJSON(cmd));
  } catch {
    res.status(500).json({ error: "Failed to send command" });
  }
});

router.get("/devices/:id/commands/:cmdId", async (req, res): Promise<void> => {
  const deviceId = parseInt(req.params["id"] ?? "", 10);
  const cmdId    = parseInt(req.params["cmdId"] ?? "", 10);
  if (!isFinite(deviceId) || !isFinite(cmdId)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [cmd] = await db
      .select()
      .from(deviceCommandsTable)
      .where(and(eq(deviceCommandsTable.id, cmdId), eq(deviceCommandsTable.deviceId, deviceId)));

    if (!cmd) { res.status(404).json({ error: "Command not found" }); return; }
    res.json(toJSON(cmd));
  } catch {
    res.status(500).json({ error: "Failed to fetch command" });
  }
});

export default router;
