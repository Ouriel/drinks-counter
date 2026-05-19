import { NextRequest, NextResponse } from "next/server";
import { db, barMenus, sessions, drinks } from "@/lib/db";
import { eq, sql, count } from "drizzle-orm";

function checkAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

// GET: list all bar menus + stats
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const menus = await db.select().from(barMenus);

  const sessionCount = await db.select({ count: count() }).from(sessions);

  const drinkCount = await db
    .select({ total: sql<number>`COALESCE(SUM(${drinks.count}), 0)` })
    .from(drinks);

  return NextResponse.json({
    menus,
    stats: {
      totalBarMenus: menus.length,
      totalSessions: sessionCount[0].count,
      totalDrinks: drinkCount[0].total,
    },
  });
}

// PATCH: update a bar menu's items
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, items, barName } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (items !== undefined) updates.items = items;
  if (barName !== undefined) updates.barName = barName;

  await db.update(barMenus).set(updates).where(eq(barMenus.id, id));
  return NextResponse.json({ ok: true });
}

// DELETE: delete a bar menu
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Unlink sessions referencing this bar menu
  await db.update(sessions).set({ barMenuId: null }).where(eq(sessions.barMenuId, id));
  await db.delete(barMenus).where(eq(barMenus.id, id));
  return NextResponse.json({ ok: true });
}
