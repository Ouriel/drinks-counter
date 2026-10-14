import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { db, sessions, barMenus } from "@/lib/db";
import { GET, POST } from "@/app/api/sessions/route";
import { jsonRequest, resetDb } from "./helpers/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/db")>();
  const { createTestDb } = await import("./helpers/test-db");
  return { ...real, db: await createTestDb(real) };
});

const create = (body: unknown) => POST(jsonRequest("/api/sessions", "POST", body));

beforeEach(() => resetDb(db));
afterEach(() => vi.useRealTimers());

describe("POST /api/sessions", () => {
  it("creates a session that expires 48h later", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T20:00:00Z"));
    const res = await create({});
    const { slug } = await res.json();
    const [row] = await db.select().from(sessions);
    expect(row.slug).toBe(slug);
    expect(row.expiresAt.toISOString()).toBe("2026-10-12T20:00:00.000Z");
  });

  it("reuses a bar menu by sanitized name and merges only new items", async () => {
    await db
      .insert(barMenus)
      .values({ barName: "le salon", items: [{ name: "Mojito", category: "cocktail" }] });
    await create({
      barName: "  Le Salon!! ",
      menuItems: ["mojito", { name: "ipa", category: "beer" }],
    });
    const menus = await db.select().from(barMenus);
    expect(menus).toHaveLength(1);
    expect(menus[0].items).toEqual([
      { name: "Mojito", category: "cocktail" },
      { name: "ipa", category: "beer" },
    ]);
  });
});

describe("GET /api/sessions", () => {
  it("returns 404 for an expired session", async () => {
    await db.insert(sessions).values({ slug: "old-one", expiresAt: new Date(Date.now() - 1000) });
    expect((await GET(jsonRequest("/api/sessions?slug=old-one", "GET"))).status).toBe(404);
  });
});
