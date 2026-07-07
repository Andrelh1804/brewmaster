import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, equipmentTable, sensorsTable, actuatorsTable, productionsTable } from "@workspace/db";
import { GetScadaStateResponse } from "@workspace/api-zod";
import { toJSON } from "../lib/serialize";

const router: IRouter = Router();

function mapEquipmentState(
  equipment: { status: string; connected: boolean },
  actuators: { isOn: boolean }[],
  sensorValues: Map<string, number>
): "off" | "running" | "waiting" | "cooling" | "fault" {
  if (equipment.status === "error") return "fault";
  if (!equipment.connected || equipment.status === "offline") return "off";
  if (equipment.status === "maintenance") return "waiting";
  const isAnyActuatorOn = actuators.some((a) => a.isOn);
  const tempValue = sensorValues.get("temperature");
  if (tempValue !== undefined && tempValue < 20) return "cooling";
  if (isAnyActuatorOn || equipment.status === "operational") return "running";
  return "waiting";
}

router.get("/scada/state", async (_req, res): Promise<void> => {
  const [allEquipment, allSensors, allActuators] = await Promise.all([
    db.select().from(equipmentTable),
    db.select().from(sensorsTable),
    db.select().from(actuatorsTable),
  ]);

  const [activeProduction] = await db
    .select()
    .from(productionsTable)
    .where(eq(productionsTable.status, "running"))
    .orderBy(desc(productionsTable.createdAt))
    .limit(1);

  // Build sensor map per equipment
  const sensorsByEquipment = new Map<number, Map<string, number>>();
  for (const sensor of allSensors) {
    if (!sensorsByEquipment.has(sensor.equipmentId)) {
      sensorsByEquipment.set(sensor.equipmentId, new Map());
    }
    sensorsByEquipment.get(sensor.equipmentId)!.set(sensor.type, sensor.currentValue);
  }

  // Build actuators per equipment
  const actuatorsByEquipment = new Map<number, typeof allActuators>();
  for (const actuator of allActuators) {
    if (!actuatorsByEquipment.has(actuator.equipmentId)) {
      actuatorsByEquipment.set(actuator.equipmentId, []);
    }
    actuatorsByEquipment.get(actuator.equipmentId)!.push(actuator);
  }

  const equipmentStates = allEquipment.map((equip) => {
    const sensors = sensorsByEquipment.get(equip.id) ?? new Map();
    const actuators = actuatorsByEquipment.get(equip.id) ?? [];
    const state = mapEquipmentState(equip, actuators, sensors);

    return {
      id: equip.id,
      name: equip.name,
      type: equip.type,
      state,
      temperature: sensors.get("temperature") ?? null,
      pressure: sensors.get("pressure") ?? null,
      level: sensors.get("level") ?? null,
      flow: sensors.get("flow") ?? null,
      ph: sensors.get("ph") ?? null,
      isOn: actuators.some((a) => a.isOn),
    };
  });

  res.json(GetScadaStateResponse.parse(toJSON({
    equipment: equipmentStates,
    activeStage: activeProduction?.currentStage ?? null,
    activeProductionId: activeProduction?.id ?? null,
    timestamp: new Date().toISOString(),
  })));
});

export default router;
