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

// sec-5c: the shared bar menu is capped at 200 items and only ever appended to.
describe("POST /api/sessions bar menu merge", () => {
  const menu = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, index) => ({ name: `${prefix}${index}`, category: "beer" }));
  const barMenu = async () => (await db.select().from(barMenus))[0].items;

  it("leaves a bar menu that already has 250 items untouched", async () => {
    await db.insert(barMenus).values({ barName: "le salon", items: menu(250, "old") });
    await create({ barName: "le salon", menuItems: [{ name: "ipa", category: "beer" }] });
    expect(await barMenu()).toEqual(menu(250, "old"));
  });

  it("adds new items only up to 200 in total", async () => {
    await db.insert(barMenus).values({ barName: "le salon", items: menu(150, "old") });
    await create({ barName: "le salon", menuItems: menu(200, "new") });
    expect(await barMenu()).toEqual([...menu(150, "old"), ...menu(50, "new")]);
  });

  it("keeps both new items when two sessions of the bar are created at once", async () => {
    const beer = { name: "beer", category: "beer" };
    const spritz = { name: "spritz", category: "cocktail" };
    const mojito = { name: "mojito", category: "cocktail" };
    await db.insert(barMenus).values({ barName: "le salon", items: [beer] });
    await Promise.all([
      create({ barName: "le salon", menuItems: [spritz] }),
      create({ barName: "le salon", menuItems: [mojito] }),
    ]);
    const items = await barMenu();
    expect(items).toHaveLength(3);
    expect(items).toEqual(expect.arrayContaining([beer, spritz, mojito]));
  });
});

describe("POST /api/sessions: one row per bar", () => {
  it("creates a single bar when two first sessions of a new bar arrive at once", async () => {
    const [first, second] = await Promise.all([
      create({ barName: "Chez Paulette", menuItems: [{ name: "pastis", category: "spirit" }] }),
      create({ barName: "chez paulette", menuItems: [{ name: "kir", category: "wine" }] }),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const bars = await db.select().from(barMenus);
    expect(bars).toHaveLength(1);
    expect(bars[0].items).toEqual(
      expect.arrayContaining([
        { name: "pastis", category: "spirit" },
        { name: "kir", category: "wine" },
      ])
    );
    const linked = await db.select().from(sessions);
    expect(new Set(linked.map((session) => session.barMenuId))).toEqual(new Set([bars[0].id]));
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
