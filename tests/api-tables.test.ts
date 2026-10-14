import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db, sessions, tables, drinks, barMenus } from "@/lib/db";
import { POST, PATCH, PUT, GET, DELETE } from "@/app/api/tables/route";
import { GET as cleanup } from "@/app/api/cron/cleanup/route";
import { getSessionView, getTableStats } from "@/lib/server-queries";
import { jsonRequest, resetDb } from "./helpers/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/db")>();
  const { createTestDb } = await import("./helpers/test-db");
  return { ...real, db: await createTestDb(real) };
});

const HOUR = 3_600_000;
const seedSession = async (slug: string, expiresInMs = 48 * HOUR) =>
  (
    await db
      .insert(sessions)
      .values({ slug, expiresAt: new Date(Date.now() + expiresInMs) })
      .returning()
  )[0];

beforeEach(() => resetDb(db));

describe("tables", () => {
  it("create + join gives distinct nicknames and shared stats", async () => {
    const host = await seedSession("host-slug");
    const guest = await seedSession("guest-slug");
    const created = await (
      await POST(jsonRequest("/api/tables", "POST", { slug: "host-slug" }))
    ).json();
    const joined = await (
      await PATCH(
        jsonRequest("/api/tables", "PATCH", {
          slug: "guest-slug",
          code: created.code.toLowerCase(),
        })
      )
    ).json();
    expect(joined.code).toBe(created.code);
    expect(joined.nickname).not.toBe(created.nickname);

    await db.insert(drinks).values([
      { sessionId: host.id, name: "beer", count: 3, category: "beer" },
      { sessionId: guest.id, name: "beer", count: 1, category: "beer" },
      { sessionId: guest.id, name: "coke", count: 2, category: "soft" },
    ]);
    const stats = await getTableStats({ code: created.code });
    expect(stats).toMatchObject({
      total: 6,
      members: [
        { nickname: created.nickname, total: 3 },
        { nickname: joined.nickname, total: 3 },
      ].sort((left, right) => left.nickname.localeCompare(right.nickname)),
      topDrinks: [
        { name: "beer", count: 4 },
        { name: "coke", count: 2 },
      ],
    });
    // Public ranking never exposes slugs
    const ranking = await (
      await GET(jsonRequest(`/api/tables?code=${created.code}`, "GET"))
    ).text();
    expect(ranking).not.toContain("slug");
  });
});

// An expired session is read-only: no table create, join (bar menu overwrite), reroll or leave.
describe("tables: expired sessions", () => {
  beforeEach(async () => {
    const [menu] = await db.insert(barMenus).values({ barName: "le salon" }).returning();
    const [table] = await db.insert(tables).values({ code: "ABC234" }).returning();
    await db.insert(sessions).values([
      {
        slug: "host-slug",
        tableId: table.id,
        barMenuId: menu.id,
        nickname: "fox",
        expiresAt: new Date(Date.now() + HOUR),
      },
      { slug: "lone-slug", expiresAt: new Date(Date.now() - HOUR) },
      {
        slug: "member-slug",
        tableId: table.id,
        nickname: "owl",
        expiresAt: new Date(Date.now() - HOUR),
      },
    ]);
  });

  it.each([
    ["POST", () => POST(jsonRequest("/api/tables", "POST", { slug: "lone-slug" }))],
    [
      "PATCH",
      () => PATCH(jsonRequest("/api/tables", "PATCH", { slug: "lone-slug", code: "ABC234" })),
    ],
    ["PUT", () => PUT(jsonRequest("/api/tables", "PUT", { slug: "member-slug" }))],
    ["DELETE", () => DELETE(jsonRequest("/api/tables?slug=member-slug", "DELETE"))],
  ])("%s returns 404 and leaves every row untouched", async (_method, call) => {
    const before = await db.select().from(sessions).orderBy(sessions.slug);
    expect((await call()).status).toBe(404);
    expect(await db.select().from(sessions).orderBy(sessions.slug)).toEqual(before);
    expect(await db.select().from(tables)).toHaveLength(1);
  });
});

describe("server-queries", () => {
  it("getSessionView hides expired sessions", async () => {
    await seedSession("live-one");
    await seedSession("dead-one", -1);
    expect((await getSessionView("live-one"))?.session.slug).toBe("live-one");
    expect(await getSessionView("dead-one")).toBeNull();
  });
});

describe("GET /api/cron/cleanup", () => {
  it("rejects a wrong secret and deletes expired sessions + orphan tables", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    const auth = (token: string) =>
      new NextRequest("http://localhost/api/cron/cleanup", {
        headers: { authorization: `Bearer ${token}` },
      });
    expect((await cleanup(auth("wrong-test-secret"))).status).toBe(401);

    const [table] = await db.insert(tables).values({ code: "ABC234" }).returning();
    const old = await seedSession("old-slug", -HOUR);
    await db.update(sessions).set({ tableId: table.id }).where(eq(sessions.id, old.id));
    await seedSession("live-slug");

    const res = await cleanup(auth("cron-test-secret"));
    expect(await res.json()).toEqual({ deletedSessions: 1, deletedTables: 1 });
    expect((await db.select().from(sessions)).map((row) => row.slug)).toEqual(["live-slug"]);
  });
});
