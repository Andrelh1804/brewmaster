---
name: BrewMaster architecture
description: Key architectural decisions for the BrewMaster AI Platform build
---

## The flow
`lib/api-spec/openapi.yaml` → Orval codegen → `lib/api-client-react` (React Query hooks) + `lib/api-zod` (Zod schemas)

**After any spec change:** run `pnpm --filter @workspace/api-spec run codegen`, then restart the frontend workflow (Vite's file cache needs a fresh start to pick up regenerated files).

**After any new schema file in `lib/db/src/schema/`:** run `pnpm run typecheck:libs` to regenerate `.d.ts` declarations and make exports visible to `@workspace/api-server`.

## activeProduction nullable
`DashboardOverview.activeProduction` uses `anyOf: [Production, null]` in the OpenAPI spec (OpenAPI 3.1 nullable pattern). This was added because the dashboard route returns null when no production is running.

## IoT simulator
`POST /api/simulator/tick` advances all sensor values with per-type noise/drift. Calling it from Settings page replaces real ESP32 hardware in Phase 1.
