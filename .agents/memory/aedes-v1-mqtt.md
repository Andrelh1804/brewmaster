---
name: aedes v1 MQTT broker integration
description: How aedes v1.x is used in BrewMaster and what changed from the older API
---

## aedes v1.x breaking changes

**Rule**: Use `import { Aedes } from "aedes"` (named export) and `await Aedes.createBroker()` — never `new Aedes()` or `import Aedes from "aedes"` (default export throws `warnMigrate`).

**Why**: aedes v1.1.1 removed the default export entirely. The class `Aedes` is a named export; the default export is a `warnMigrate` function that throws on construction.

**How to apply**: Every file importing aedes must use the named import. `createBroker()` is async so `attachMqttBroker()` must also be async and awaited in `index.ts`.

## orval schemas config causes duplicate TS exports

**Rule**: Do NOT set `schemas: { path: "generated/types", ... }` in the orval `zod` output config.

**Why**: orval regenerates `lib/api-zod/src/index.ts` on every codegen run with `export * from './generated/types'`. When `schemas` is set, both `generated/api.ts` (Zod values) and `generated/types/` (TS types) export the same param schema names → `TS2308 duplicate export` on typecheck.

**How to apply**: Remove the `schemas` option from the `zod` output block in `lib/api-spec/orval.config.ts`. The Zod schemas in `api.ts` already carry full type information via `z.infer`.

## Phase 3 IoT infrastructure structure

- Embedded MQTT broker at `artifacts/api-server/src/lib/mqtt/broker.ts`
- Frontend real-time WebSocket at `artifacts/api-server/src/lib/websocket.ts`
- ESP32 simulator at `artifacts/api-server/src/lib/esp32-simulator.ts`
- HTTP upgrade routing in `artifacts/api-server/src/index.ts` — `/mqtt` → mqttWss, `/ws` → frontendWss
- 7 new DB tables: device_groups, device_commands, mqtt_messages, telemetry, firmware_versions, ota_jobs, communication_logs
- 6 new frontend pages: iot-dashboard, mqtt-monitor, telemetry-viewer, command-center, firmware-ota, comm-logs
