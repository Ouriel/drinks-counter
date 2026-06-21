import { NextRequest, NextResponse } from "next/server";
import { db, barMenus, sessions, drinks, tables, normalizeMenuItems } from "@/lib/db";
import { eq, sql, count } from "drizzle-orm";
import { verifySecret } from "@/lib/auth";
import { adminPatchSchema, parseBody } from "@/lib/schemas";
import { z } from "zod";

function checkAuth(req: NextRequest) {
  return verifySecret(req.headers.get("authorization"), process.env.ADMIN_SECRET);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tab = req.nextUrl.searchParams.get("tab") || "bars";

  if (tab === "sessions") {
    const allSessions = await db
      .select({
        id: sessions.id,
        slug: sessions.slug,
        barMenuId: sessions.barMenuId,
        tableId: sessions.tableId,
        nickname: sessions.nickname,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        drinkCount: sql<number>`COALESCE((SELECT SUM("count") FROM "drinks" WHERE "drinks"."session_id" = "sessions"."id"), 0)::int`,
      })
      .from(sessions)
      .orderBy(sql`${sessions.createdAt} DESC`)
      .limit(100);
    return NextResponse.json({ sessions: allSessions });
  }

  if (tab === "tables") {
    const allTables = await db
      .select({
        id: tables.id,
        code: tables.code,
        createdAt: tables.createdAt,
        memberCount: sql<number>`(SELECT COUNT(*) FROM "sessions" WHERE "sessions"."table_id" = "tables"."id")::int`,
      })
      .from(tables)
      .orderBy(sql`${tables.createdAt} DESC`)
      .limit(100);
    return NextResponse.json({ tables: allTables });
  }

  if (tab === "session-detail") {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const sessionDrinks = await db
      .select({ name: drinks.name, count: drinks.count, category: drinks.category })
      .from(drinks)
      .where(eq(drinks.sessionId, id))
      .orderBy(sql`${drinks.count} DESC`);
    return NextResponse.json({ drinks: sessionDrinks });
  }

  if (tab === "table-detail") {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const members = await db
      .select({
        nickname: sessions.nickname,
        slug: sessions.slug,
        total: sql<number>`COALESCE(SUM(${drinks.count}), 0)::int`,
      })
      .from(sessions)
      .leftJoin(drinks, eq(drinks.sessionId, sessions.id))
      .where(eq(sessions.tableId, id))
      .groupBy(sessions.id, sessions.nickname, sessions.slug)
      .orderBy(sql`COALESCE(SUM(${drinks.count}), 0) DESC`);
    return NextResponse.json({
      members: members.map((member) => ({
        nickname: member.nickname || "???",
        slug: member.slug,
        total: Number(member.total),
      })),
    });
  }

  // Default: bars
  const menus = await db.select().from(barMenus);
  const [sessionCount] = await db.select({ count: count() }).from(sessions);
  const [drinkCount] = await db
    .select({ total: sql<number>`COALESCE(SUM(${drinks.count}), 0)` })
    .from(drinks);

  return NextResponse.json({
    menus: menus.map((menu) => ({ ...menu, items: normalizeMenuItems(menu.items) })),
    stats: {
      totalBarMenus: menus.length,
      totalSessions: sessionCount.count,
      totalDrinks: drinkCount.total,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(adminPatchSchema, body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id, items, barName } = parsed.data;

  const updates: { items?: { name: string; category: string }[]; barName?: string } = {};
  if (items) updates.items = items;
  if (barName) updates.barName = barName;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(barMenus).set(updates).where(eq(barMenus.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const type = (body as { type?: string }).type || "bar";

  if (type === "session") {
    const parsed = parseBody(z.object({ type: z.literal("session"), id: z.string().uuid() }), body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    await db.delete(drinks).where(eq(drinks.sessionId, parsed.data.id));
    await db.delete(sessions).where(eq(sessions.id, parsed.data.id));
    return NextResponse.json({ ok: true });
  }

  if (type === "table") {
    const parsed = parseBody(z.object({ type: z.literal("table"), id: z.string().uuid() }), body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    await db.delete(tables).where(eq(tables.id, parsed.data.id));
    return NextResponse.json({ ok: true });
  }

  // Default: bar
  const parsed = parseBody(z.object({ id: z.string().uuid() }), body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await db.delete(barMenus).where(eq(barMenus.id, parsed.data.id));
  return NextResponse.json({ ok: true });
}
