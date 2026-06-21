import { getTranslations } from "next-intl/server";
import { db, barMenus, sessions, drinks, normalizeMenuItems } from "@/lib/db";
import { sql, count, desc, gt } from "drizzle-orm";
import { CategoryIcon } from "@/lib/category-icon";
import { ChartColumn, Beer, Martini } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function StatsPage() {
  const t = await getTranslations("stats");
  const tBar = await getTranslations("bar");
  const tCat = await getTranslations("categories");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [
    [menuCount],
    [sessionCount],
    [activeCount],
    [drinkTotal],
    [drinksToday],
    [drinksWeek],
    topDrinks,
    byCategory,
    topBarsRaw,
  ] = await Promise.all([
    db.select({ count: count() }).from(barMenus),
    db.select({ count: count() }).from(sessions),
    db.select({ count: count() }).from(sessions).where(gt(sessions.expiresAt, now)),
    db.select({ total: sql<number>`COALESCE(SUM(${drinks.count}), 0)` }).from(drinks),
    db
      .select({ total: sql<number>`COALESCE(SUM(${drinks.count}), 0)` })
      .from(drinks)
      .where(gt(drinks.createdAt, todayStart)),
    db
      .select({ total: sql<number>`COALESCE(SUM(${drinks.count}), 0)` })
      .from(drinks)
      .where(gt(drinks.createdAt, weekStart)),
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

  const avgPerSession =
    sessionCount.count > 0 ? Math.round((drinkTotal.total / sessionCount.count) * 10) / 10 : 0;

  const topBars = topBarsRaw.map((bar) => {
    const items = normalizeMenuItems(bar.items);
    const catCounts: Record<string, number> = {};
    for (const item of items) {
      catCounts[item.category] = (catCounts[item.category] || 0) + 1;
    }
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      barName: bar.barName,
      itemCount: items.length,
      topCategory: topCat ? topCat[0] : null,
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-2xl">
          ←
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChartColumn className="w-6 h-6" />
          {t("title")}
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-default-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{menuCount.count}</p>
          <p className="text-sm text-default-500 mt-1">{t("bars")}</p>
        </div>
        <div className="bg-default-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{sessionCount.count}</p>
          <p className="text-sm text-default-500 mt-1">{t("sessions")}</p>
        </div>
        <div className="bg-default-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{drinkTotal.total}</p>
          <p className="text-sm text-default-500 mt-1">{t("drinks")}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-default-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{activeCount.count}</p>
          <p className="text-sm text-default-500 mt-1">{t("active")}</p>
        </div>
        <div className="bg-default-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{drinksToday.total}</p>
          <p className="text-sm text-default-500 mt-1">{t("today")}</p>
        </div>
        <div className="bg-default-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{drinksWeek.total}</p>
          <p className="text-sm text-default-500 mt-1">{t("thisWeek")}</p>
        </div>
      </div>

      <p className="text-sm text-default-500 mb-8 text-center">
        {t("avgPerSession", { avg: avgPerSession })}
      </p>

      {byCategory.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-3">{t("byCategory")}</h2>
          <div className="grid grid-cols-2 gap-2 mb-8">
            {byCategory.map((row) => (
              <div
                key={row.category || "other"}
                className="bg-default-100 rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <CategoryIcon category={row.category} className="w-5 h-5 shrink-0" />
                <span className="text-sm flex-1">{tCat(row.category || "other")}</span>
                <span className="font-bold tabular-nums">{row.total}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Beer className="w-5 h-5" />
        {t("topDrinks")}
      </h2>
      <div className="space-y-2 mb-8">
        {topDrinks.map((drink, i) => (
          <div
            key={drink.name}
            className="flex justify-between bg-default-100 rounded-lg px-4 py-3"
          >
            <span className="text-base">
              <span className="text-default-500 mr-2">{i + 1}.</span>
              {drink.name}
            </span>
            <span className="font-bold tabular-nums text-base">{drink.total}</span>
          </div>
        ))}
        {topDrinks.length === 0 && <p className="text-default-500">{t("noDrinks")}</p>}
      </div>

      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Martini className="w-5 h-5" />
        {t("topBars")}
      </h2>
      <div className="space-y-2">
        {topBars.map((bar, i) => (
          <div
            key={bar.barName}
            className="flex justify-between items-center bg-default-100 rounded-lg px-4 py-3 gap-2"
          >
            <div className="flex-1 min-w-0 flex items-baseline gap-1">
              <span className="text-default-500 shrink-0">{i + 1}.</span>
              <span className="truncate">{bar.barName}</span>
              {bar.topCategory && (
                <span className="text-default-500 text-sm shrink-0 ml-1 flex items-center gap-1">
                  <CategoryIcon category={bar.topCategory} className="w-3.5 h-3.5" />
                  {tCat(bar.topCategory)}
                </span>
              )}
            </div>
            <span className="text-default-500 text-sm whitespace-nowrap">
              {tBar("items", { count: bar.itemCount })}
            </span>
          </div>
        ))}
        {topBars.length === 0 && <p className="text-default-500">{t("noBars")}</p>}
      </div>
    </div>
  );
}
