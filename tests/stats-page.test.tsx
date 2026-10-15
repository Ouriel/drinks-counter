import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { db, sessions, drinks, barMenus } from "@/lib/db";
import StatsPage from "@/app/[locale]/stats/page";
import { resetDb } from "./helpers/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/db")>();
  const { createTestDb } = await import("./helpers/test-db");
  return { ...real, db: await createTestDb(real) };
});
// Labels render as their message key, values as-is → assert on keys, not translations.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => `[${namespace}.${key}]`,
}));

const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();
const tile = (html: string, key: string) =>
  html.match(new RegExp(`<p[^>]*>(\\d+)</p><p[^>]*>\\[stats\\.${key}\\]</p>`))?.[1];

beforeEach(async () => {
  await resetDb(db);
  const [session] = await db
    .insert(sessions)
    .values({ slug: "fizzy-julep", expiresAt: new Date(Date.now() + 18 * HOUR) })
    .returning();
  // Row created 30h ago (yesterday), re-ordered 2h ago: 1 tap in the last 24h.
  await db.insert(drinks).values({
    sessionId: session.id,
    name: "beer",
    count: 2,
    tappedAt: [ago(30), ago(2)],
    createdAt: new Date(ago(30)),
  });
});

// B8: the cron deletes sessions and their drinks 48h after they start, yet the page read
// like all-time totals, and "Today" summed rows by creation day instead of counting taps.
describe("B8: stats page is honest about its window", () => {
  it("counts taps in the last 24h and says data is only kept a couple of days", async () => {
    const html = renderToString(await StatsPage());
    expect(tile(html, "last24h")).toBe("1");
    expect(html).toContain("[stats.retention]");
    expect(html).not.toContain("[stats.thisWeek]"); // always equal to the total: dropped
  });
});

// Design review B5: "Top bars" listed bars that have no menu yet ("0 items").
describe("stats top bars", () => {
  it("leaves out bars with an empty menu", async () => {
    await db.insert(barMenus).values([
      { barName: "le salon", items: [{ name: "ipa", category: "beer" }] },
      { barName: "kenavo", items: [] },
    ]);
    const html = renderToString(await StatsPage());
    expect(html).toContain("le salon");
    expect(html).not.toContain("kenavo");
  });
});
