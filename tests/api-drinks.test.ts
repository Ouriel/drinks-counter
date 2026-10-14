import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db, sessions, drinks, barMenus } from "@/lib/db";
import { GET, POST, PATCH } from "@/app/api/drinks/route";
import { jsonRequest, resetDb } from "./helpers/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/db")>();
  const { createTestDb } = await import("./helpers/test-db");
  return { ...real, db: await createTestDb(real) };
});

const HOUR = 3_600_000;

async function seedSession(slug = "fizzy-julep", expiresInMs = 48 * HOUR, barMenuId?: string) {
  const [session] = await db
    .insert(sessions)
    .values({ slug, barMenuId, expiresAt: new Date(Date.now() + expiresInMs) })
    .returning();
  return session;
}

const tap = (name: string, slug = "fizzy-julep", category?: string) =>
  POST(jsonRequest("/api/drinks", "POST", { slug, name, category }));

beforeEach(() => resetDb(db));

describe("POST /api/drinks", () => {
  it("creates a drink with one tap timestamp", async () => {
    const session = await seedSession();
    const res = await tap("  Mojito ", "fizzy-julep", "cocktail");
    expect(res.status).toBe(200);
    const [row] = await db.select().from(drinks).where(eq(drinks.sessionId, session.id));
    expect(row).toMatchObject({ name: "mojito", count: 1, category: "cocktail" });
    expect(row.tappedAt).toHaveLength(1);
  });

  it("increments the existing row case-insensitively and appends a tap", async () => {
    await seedSession();
    await tap("Mojito");
    const res = await tap("MOJITO");
    expect(await res.json()).toEqual({ count: 2 });
    const rows = await db.select().from(drinks);
    expect(rows).toHaveLength(1);
    expect(rows[0].tappedAt).toHaveLength(2);
  });

  it("returns 404 for an expired session", async () => {
    await seedSession("fizzy-julep", -1);
    expect((await tap("beer")).status).toBe(404);
  });

  it("adds a new drink to the session's bar menu once", async () => {
    const [menu] = await db.insert(barMenus).values({ barName: "le salon", items: [] }).returning();
    await seedSession("fizzy-julep", 48 * HOUR, menu.id);
    await tap("Spritz", "fizzy-julep", "cocktail");
    const [after] = await db.select().from(barMenus);
    expect(after.items).toEqual([{ name: "spritz", category: "cocktail" }]);
  });

  it("rejects invalid JSON and invalid bodies with 400", async () => {
    const bad = new Request("http://localhost/api/drinks", { method: "POST", body: "{" });
    expect((await POST(bad as never)).status).toBe(400);
    expect((await tap("", "fizzy-julep")).status).toBe(400);
  });
});

describe("PATCH /api/drinks", () => {
  async function seedDrink(count: number) {
    const session = await seedSession();
    const tappedAt = Array.from({ length: count }, (_, index) => `2026-01-01T20:0${index}:00.000Z`);
    const [drink] = await db
      .insert(drinks)
      .values({ sessionId: session.id, name: "beer", count, tappedAt })
      .returning();
    return drink;
  }
  const patch = (drinkId: string, delta: 1 | -1, slug = "fizzy-julep") =>
    PATCH(jsonRequest("/api/drinks", "PATCH", { slug, drinkId, delta }));

  it("decrement drops the LAST tap and the count", async () => {
    const drink = await seedDrink(3);
    expect(await (await patch(drink.id, -1)).json()).toEqual({ ok: true });
    const [row] = await db.select().from(drinks);
    expect(row.count).toBe(2);
    expect(row.tappedAt).toEqual(["2026-01-01T20:00:00.000Z", "2026-01-01T20:01:00.000Z"]);
  });

  it("decrement on the last unit deletes the row", async () => {
    const drink = await seedDrink(1);
    expect(await (await patch(drink.id, -1)).json()).toEqual({ deleted: true });
    expect(await db.select().from(drinks)).toEqual([]);
  });

  it("refuses to touch a drink from another session", async () => {
    const drink = await seedDrink(2);
    await seedSession("other-slug");
    expect((await patch(drink.id, 1, "other-slug")).status).toBe(404);
    const [row] = await db.select().from(drinks);
    expect(row.count).toBe(2);
  });
});

describe("GET /api/drinks", () => {
  it("returns 400 without slug and 404 for unknown slug", async () => {
    expect((await GET(jsonRequest("/api/drinks", "GET"))).status).toBe(400);
    expect((await GET(jsonRequest("/api/drinks?slug=nope", "GET"))).status).toBe(404);
  });
});
