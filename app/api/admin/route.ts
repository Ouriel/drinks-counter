import { NextRequest, NextResponse } from "next/server";
import { db, barMenus, sessions, drinks, normalizeMenuItems } from "@/lib/db";
import type { MenuItem } from "@/lib/db";
import { eq, sql, count } from "drizzle-orm";

function checkAuth(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const menus = await db.select().from(barMenus);
  const [sessionCount] = await db.select({ count: count() }).from(sessions);
  const [drinkCount] = await db
    .select({ total: sql<number>`COALESCE(SUM(${drinks.count}), 0)` })
    .from(drinks);

  return NextResponse.json({
    menus: menus.map((m) => ({ ...m, items: normalizeMenuItems(m.items) })),
    stats: {
      totalBarMenus: menus.length,
      totalSessions: sessionCount.count,
      totalDrinks: drinkCount.total,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, items, barName } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updates: { items?: MenuItem[]; barName?: string } = {};
  if (Array.isArray(items)) {
    updates.items = items.map((i: MenuItem | string) =>
      typeof i === "string" ? { name: i, category: "other" } : i
    );
  }
  if (typeof barName === "string") updates.barName = barName;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(barMenus).set(updates).where(eq(barMenus.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.update(sessions).set({ barMenuId: null }).where(eq(sessions.barMenuId, id));
  await db.delete(barMenus).where(eq(barMenus.id, id));
  return NextResponse.json({ ok: true });
}
