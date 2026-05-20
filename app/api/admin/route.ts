import { NextRequest, NextResponse } from "next/server";
import { db, barMenus, sessions, drinks, normalizeMenuItems } from "@/lib/db";
import { eq, sql, count } from "drizzle-orm";
import { verifySecret } from "@/lib/auth";
import { adminPatchSchema, parseBody } from "@/lib/schemas";
import { z } from "zod";

function checkAuth(req: NextRequest) {
  return verifySecret(req.headers.get("authorization"), process.env.ADMIN_SECRET);
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

  const body = await req.json();
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

  const body = await req.json();
  const parsed = parseBody(z.object({ id: z.string().uuid() }), body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  await db.update(sessions).set({ barMenuId: null }).where(eq(sessions.barMenuId, id));
  await db.delete(barMenus).where(eq(barMenus.id, id));
  return NextResponse.json({ ok: true });
}
