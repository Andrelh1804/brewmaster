# BrewMaster AI

A professional SaaS platform for automated craft beer production using IoT (ESP32). Built as a SCADA/HMI-style industrial system with real-time sensor monitoring, recipe management, production control, alarms, reports, and an AI brewing assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/brewmaster run dev` — run the frontend (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite + Tailwind CSS + Recharts + Wouter routing + TanStack Query
- **Backend**: Express 5 (Node.js)
- **DB**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema (users, recipes, productions, equipment, sensors, actuators, alarms, events, ai_messages)
- `artifacts/api-server/src/routes/` — all Express route handlers (one file per domain)
- `artifacts/api-server/src/lib/serialize.ts` — `toJSON()` utility to convert Date→string before Zod parsing
- `artifacts/brewmaster/src/` — React frontend (all pages/components)

## Architecture decisions

- **OpenAPI-first**: all types flow from `openapi.yaml` → Orval codegen → Zod validators (server) + React Query hooks (frontend)
- **`toJSON()` before Zod parsing**: Drizzle returns `Date` objects; OpenAPI-generated Zod schemas expect ISO strings. All route handlers call `toJSON(dbResult)` before `.parse()`.
- **IoT simulator**: `POST /api/simulator/tick` advances all sensor values with realistic noise/drift. No real ESP32 needed in Phase 1.
- **Forced dark mode**: `document.documentElement.classList.add('dark')` in `main.tsx` — no light mode toggle.
- **activeProduction nullable**: `DashboardOverview.activeProduction` is `anyOf: [Production, null]` to handle no active batch state.

## Product

- **Dashboard**: live sensor grid (12 sensors), active production status, alarm count, recent events feed — auto-refreshes every 5s
- **Production Control**: start/pause/resume/cancel/skip-stage with visual stage timeline (mashing → done)
- **Recipes**: full CRUD for beer recipes (malts, hops, yeasts, water profile, mash/fermentation/maturation profiles)
- **Equipment**: 8 equipment types (fermenter, kettle, mash tun, HLT, pump, valve, chiller, CO2 tank)
- **Sensors & Actuators**: 12 sensors, 8 actuators with live toggle control
- **Alarms**: priority/severity system with acknowledge workflow
- **Reports**: production summary, sensor history charts, alarm pie chart (all via Recharts)
- **AI Assistant**: simulated brewing advisor with diagnosis feature
- **Users**: role-based (admin, brewmaster, operator, visitor)

## User preferences

_Populate as needed._

## Gotchas

- After any `lib/api-spec/openapi.yaml` change: run codegen, then run `typecheck:libs`, then rebuild the API server
- `toJSON()` must wrap any DB result before passing to Zod `.parse()` — missing it causes 500s on valid DB responses
- The `pnpm run typecheck:libs` step is required after adding new schema files to `lib/db/src/schema/` to make the exports visible to `@workspace/api-server`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
