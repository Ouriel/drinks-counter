import { getTranslations } from "next-intl/server";
import { db, barMenus, sessions, drinks, normalizeMenuItems } from "@/lib/db";
import { sql, count, desc } from "drizzle-orm";
import { CATEGORY_EMOJI } from "@/lib/constants";

export const revalidate = 60;

export default async function StatsPage() {
  const t = await getTranslations("stats");
  const [[menuCount], [sessionCount], [drinkTotal], topDrinks, byCategory, topBarsRaw] =
    await Promise.all([
      db.select({ count: count() }).from(barMenus),
      db.select({ count: count() }).from(sessions),
      db.select({ total: sql<number>`COALESCE(SUM(${drinks.count}), 0)` }).from(drinks),
      db
        .select({ name: drinks.name, total: sql<number>`SUM(${drinks.count})` })
        .from(drinks)
        .groupBy(drinks.name)
        .orderBy(desc(sql`SUM(${drinks.count})`))
        .limit(10),
      db
        .select({ category: drinks.category, total: sql<number>`SUM(${drinks.count})` })
        .from(drinks)
        .groupBy(drinks.category)
        .orderBy(desc(sql`SUM(${drinks.count})`)),
      db
        .select()
        .from(barMenus)
        .orderBy(desc(sql`jsonb_array_length(${barMenus.items})`))
        .limit(10),
    ]);

  const topBars = topBarsRaw.map((b) => ({
    barName: b.barName,
    itemCount: normalizeMenuItems(b.items).length,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-surface rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{menuCount.count}</p>
          <p className="text-sm text-muted mt-1">{t("bars")}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{sessionCount.count}</p>
          <p className="text-sm text-muted mt-1">{t("sessions")}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{drinkTotal.total}</p>
          <p className="text-sm text-muted mt-1">{t("drinks")}</p>
        </div>
      </div>

      {byCategory.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-3">{t("byCategory")}</h2>
          <div className="grid grid-cols-2 gap-2 mb-8">
            {byCategory.map((c) => (
              <div
                key={c.category || "other"}
                className="bg-surface rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <span className="text-lg">{CATEGORY_EMOJI[c.category || "other"] || "🍹"}</span>
                <span className="text-sm flex-1">{c.category || "other"}</span>
                <span className="font-bold tabular-nums">{c.total}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-bold mb-3">{t("topDrinks")}</h2>
      <div className="space-y-2 mb-8">
        {topDrinks.map((d, i) => (
          <div key={d.name} className="flex justify-between bg-surface rounded-lg px-4 py-3">
            <span className="text-base">
              <span className="text-muted mr-2">{i + 1}.</span>
              {d.name}
            </span>
            <span className="font-bold tabular-nums text-base">{d.total}</span>
          </div>
        ))}
        {topDrinks.length === 0 && <p className="text-muted">{t("noDrinks")}</p>}
      </div>

      <h2 className="text-lg font-bold mb-3">{t("topBars")}</h2>
      <div className="space-y-2">
        {topBars.map((b, i) => (
          <div key={b.barName} className="flex justify-between bg-surface rounded-lg px-4 py-3">
            <span className="text-base">
              <span className="text-muted mr-2">{i + 1}.</span>
              {b.barName}
            </span>
            <span className="text-muted text-base">{b.itemCount} items</span>
          </div>
        ))}
        {topBars.length === 0 && <p className="text-muted">{t("noBars")}</p>}
      </div>
    </div>
  );
}
