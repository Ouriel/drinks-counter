import { db, barMenus, sessions, drinks } from "@/lib/db";
import { sql, count, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [menuCount] = await db.select({ count: count() }).from(barMenus);
  const [sessionCount] = await db.select({ count: count() }).from(sessions);
  const [drinkTotal] = await db
    .select({ total: sql<number>`COALESCE(SUM(${drinks.count}), 0)` })
    .from(drinks);

  const topDrinks = await db
    .select({
      name: drinks.name,
      total: sql<number>`SUM(${drinks.count})`,
    })
    .from(drinks)
    .groupBy(drinks.name)
    .orderBy(desc(sql`SUM(${drinks.count})`))
    .limit(10);

  const topBars = await db
    .select({
      barName: barMenus.barName,
      itemCount: sql<number>`jsonb_array_length(${barMenus.items})`,
    })
    .from(barMenus)
    .orderBy(desc(sql`jsonb_array_length(${barMenus.items})`))
    .limit(10);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-2xl font-bold mb-6">📊 Stats</h1>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{menuCount.count}</p>
          <p className="text-xs text-gray-400">Bars</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{sessionCount.count}</p>
          <p className="text-xs text-gray-400">Sessions</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{drinkTotal.total}</p>
          <p className="text-xs text-gray-400">Drinks</p>
        </div>
      </div>

      <h2 className="text-lg font-bold mb-3">🍺 Top Drinks</h2>
      <div className="space-y-2 mb-8">
        {topDrinks.map((d, i) => (
          <div key={d.name} className="flex justify-between bg-gray-800 rounded-lg px-4 py-3">
            <span>
              <span className="text-gray-400 mr-2">{i + 1}.</span>
              {d.name}
            </span>
            <span className="font-bold tabular-nums">{d.total}</span>
          </div>
        ))}
        {topDrinks.length === 0 && <p className="text-gray-400">No drinks yet</p>}
      </div>

      <h2 className="text-lg font-bold mb-3">🍸 Top Bars</h2>
      <div className="space-y-2">
        {topBars.map((b, i) => (
          <div key={b.barName} className="flex justify-between bg-gray-800 rounded-lg px-4 py-3">
            <span>
              <span className="text-gray-400 mr-2">{i + 1}.</span>
              {b.barName}
            </span>
            <span className="text-gray-400">{b.itemCount} items</span>
          </div>
        ))}
        {topBars.length === 0 && <p className="text-gray-400">No bars yet</p>}
      </div>
    </div>
  );
}
