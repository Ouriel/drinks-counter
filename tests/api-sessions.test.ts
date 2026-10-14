import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { db, sessions, barMenus } from "@/lib/db";
import { GET, POST } from "@/app/api/sessions/route";
import { generateSlug } from "@/lib/slugs";
import { jsonRequest, resetDb } from "./helpers/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/db")>();
  const { createTestDb } = await import("./helpers/test-db");
  return { ...real, db: await createTestDb(real) };
});

vi.mock("@/lib/slugs", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/slugs")>();
  return { ...real, generateSlug: vi.fn(real.generateSlug) };
});

const create = (body: unknown) => POST(jsonRequest("/api/sessions", "POST", body));
const GENERATED = /^[a-z]+-[a-z-]+-[a-hj-np-z2-9]{4}$/;
const seedSession = (slug: string) =>
  db.insert(sessions).values({ slug, expiresAt: new Date(Date.now() + 3_600_000) });

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

describe("POST /api/sessions slugs", () => {
  it("keeps a custom name exactly as typed", async () => {
    expect(await (await create({ slug: "party" })).json()).toEqual({ slug: "party" });
  });

  it("falls back to a generated slug when the custom name is taken", async () => {
    await seedSession("party");
    const res = await create({ slug: "party" });
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toMatch(GENERATED);
  });

  it("rejects a reserved name", async () => {
    expect((await create({ slug: "admin" })).status).toBe(400);
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it("retries when a generated slug collides", async () => {
    await seedSession("fizzy-pint-ab3k");
    vi.mocked(generateSlug).mockReturnValueOnce("fizzy-pint-ab3k");
    const res = await create({});
    expect(res.status).toBe(200);
    expect((await res.json()).slug).not.toBe("fizzy-pint-ab3k");
    expect(await db.select().from(sessions)).toHaveLength(2);
  });
});

describe("GET /api/sessions", () => {
  it("returns 404 for an expired session", async () => {
    await db.insert(sessions).values({ slug: "old-one", expiresAt: new Date(Date.now() - 1000) });
    expect((await GET(jsonRequest("/api/sessions?slug=old-one", "GET"))).status).toBe(404);
  });
});
