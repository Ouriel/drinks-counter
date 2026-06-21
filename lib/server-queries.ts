import {
  db,
  sessions,
  barMenus,
  tables,
  drinks as drinksTable,
  normalizeMenuItems,
} from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import type { Drink, MenuItem } from "@/lib/types";

// Server-only data access shared by the API routes AND the server-rendered pages,
// so pages can fetch their data during the server render (no client fetch waterfall)
// while the API keeps the exact same response shapes for client-side updates/polling.

export type SessionView = {
  session: {
    id: string;
    slug: string;
    barName: string | null;
    tableCode: string | null;
    nickname: string | null;
  };
  menuItems: MenuItem[];
};

/** Session + bar menu + table resolved in ONE round-trip. Returns null if not found/expired. */
export async function getSessionView(slug: string): Promise<SessionView | null> {
  const rows = await db
    .select()
    .from(sessions)
    .leftJoin(barMenus, eq(sessions.barMenuId, barMenus.id))
    .leftJoin(tables, eq(sessions.tableId, tables.id))
    .where(eq(sessions.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row || row.sessions.expiresAt < new Date()) return null;

  const session = row.sessions;
  const menu = row.bar_menus;
  return {
    session: {
      id: session.id,
      slug: session.slug,
      barName: menu?.barName ?? null,
      tableCode: row.tables?.code ?? null,
      nickname: session.nickname,
    },
    menuItems: menu ? normalizeMenuItems(menu.items) : [],
  };
}

/** Drinks for a session by slug (one round-trip). Returns [] if the session has none/doesn't exist. */
export async function getSessionDrinks(slug: string): Promise<Drink[]> {
  const rows = await db
    .select({ drink: drinksTable })
    .from(drinksTable)
    .innerJoin(sessions, eq(drinksTable.sessionId, sessions.id))
    .where(eq(sessions.slug, slug));
  return rows.map((r) => ({
    id: r.drink.id,
    name: r.drink.name,
    count: r.drink.count,
    category: r.drink.category,
    tappedAt: r.drink.tappedAt,
    createdAt: r.drink.createdAt.toISOString(),
  }));
}

export type TableStats = {
  code: string;
  total: number;
  members: { nickname: string; total: number }[];
  byCategory: { category: string; count: number }[];
  topDrinks: { name: string; category: string | null; count: number }[];
};

/** Aggregated table stats, resolved from a public table code or a private session slug. */
export async function getTableStats(opts: {
  code?: string | null;
  slug?: string | null;
}): Promise<TableStats | null> {
  let table: typeof tables.$inferSelect | undefined;
  if (opts.code) {
    [table] = await db
      .select()
      .from(tables)
      .where(eq(tables.code, opts.code.toUpperCase()))
      .limit(1);
  } else if (opts.slug) {
    const rows = await db
      .select()
      .from(sessions)
      .innerJoin(tables, eq(sessions.tableId, tables.id))
      .where(eq(sessions.slug, opts.slug))
      .limit(1);
    table = rows[0]?.tables;
  }
  if (!table) return null;

  const [statsMembers, byCategory, topDrinks] = await Promise.all([
    db
      .select({
        nickname: sessions.nickname,
        total: sql<number>`COALESCE(SUM(${drinksTable.count}), 0)::int`,
      })
      .from(sessions)
      .leftJoin(drinksTable, eq(drinksTable.sessionId, sessions.id))
      .where(eq(sessions.tableId, table.id))
      .groupBy(sessions.id, sessions.nickname)
      .orderBy(sql`COALESCE(SUM(${drinksTable.count}), 0) DESC`, sessions.nickname),
    db
      .select({
        category: drinksTable.category,
        count: sql<number>`SUM(${drinksTable.count})::int`,
      })
      .from(drinksTable)
      .innerJoin(sessions, eq(drinksTable.sessionId, sessions.id))
      .where(eq(sessions.tableId, table.id))
      .groupBy(drinksTable.category),
    db
      .select({
        name: drinksTable.name,
        category: drinksTable.category,
        count: sql<number>`SUM(${drinksTable.count})::int`,
      })
      .from(drinksTable)
      .innerJoin(sessions, eq(drinksTable.sessionId, sessions.id))
      .where(eq(sessions.tableId, table.id))
      .groupBy(drinksTable.name, drinksTable.category)
      .orderBy(sql`SUM(${drinksTable.count}) DESC`)
      .limit(8),
  ]);

  const total = byCategory.reduce((sum, row) => sum + Number(row.count), 0);
  return {
    code: table.code,
    total,
    members: statsMembers.map((m) => ({ nickname: m.nickname || "???", total: Number(m.total) })),
    byCategory: byCategory.map((r) => ({
      category: r.category || "other",
      count: Number(r.count),
    })),
    topDrinks: topDrinks.map((r) => ({
      name: r.name,
      category: r.category,
      count: Number(r.count),
    })),
  };
}
