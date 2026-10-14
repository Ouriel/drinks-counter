import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import type * as Schema from "@/lib/db";

// In-memory Postgres (PGlite) with the real Drizzle schema pushed onto it.
// Used as the replacement `db` in vi.mock("@/lib/db") so route handlers run real SQL.
export async function createTestDb(schema: typeof Schema) {
  const db = drizzle();
  const { barMenus, tables, sessions, drinks } = schema;
  const { apply } = await pushSchema({ barMenus, tables, sessions, drinks }, db as never);
  await apply();
  return db;
}

export async function resetDb(db: {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
}) {
  if (process.env.POSTGRES_URL) throw new Error("refusing TRUNCATE: POSTGRES_URL is set");
  await db.execute(sql`TRUNCATE bar_menus, tables, sessions, drinks CASCADE`);
}

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
