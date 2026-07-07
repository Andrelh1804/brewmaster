/**
 * Converts Date objects to ISO strings recursively for Zod parsing.
 * Drizzle returns Date objects from PostgreSQL; OpenAPI-generated Zod schemas expect strings.
 */
export function toJSON<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}
