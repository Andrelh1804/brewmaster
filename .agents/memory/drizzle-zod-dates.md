---
name: Drizzle-to-Zod date serialization
description: Drizzle ORM returns Date objects; OpenAPI-generated Zod schemas expect ISO strings — must call toJSON() before .parse()
---

## Rule
All DB query results must be passed through `toJSON()` before calling `.parse()` on any Orval-generated Zod schema.

**Why:** Drizzle ORM returns JavaScript `Date` objects for timestamp/date columns. Orval-generated Zod schemas reflect the OpenAPI spec which types all datetimes as `string`, so passing raw DB rows causes `ZodError: Expected string, received date` on valid DB responses.

**How to apply:** `artifacts/api-server/src/lib/serialize.ts` exports `toJSON<T>(data: T): T` which does `JSON.parse(JSON.stringify(data))`. Call it on every DB result before a Zod `.parse()`. The pattern in routes is `SomeResponse.parse(toJSON(dbResult))`. Any new route that reads from the DB must follow this pattern.

**Coverage gap to watch:** The automated sed/node replacement only covers single-line `.parse(EXPR)` calls. Multi-line parse calls (`parse({...multiline...})`) were handled manually. Always verify new routes for both forms.
