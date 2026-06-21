import { NextRequest, NextResponse } from "next/server";
import { db, barMenus, normalizeMenuItems } from "@/lib/db";
import { sql } from "drizzle-orm";
import { sanitizeBarName } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) return NextResponse.json({ menus: [] });

  const sanitized = sanitizeBarName(q);
  if (!sanitized) return NextResponse.json({ menus: [] });

  const tokens = sanitized.split(" ").filter((token) => token.length >= 2);
  if (tokens.length === 0) return NextResponse.json({ menus: [] });

  const conditions = tokens.map((token) => sql`bar_name ILIKE ${"%" + token + "%"}`);
  const whereClause = sql.join(conditions, sql` AND `);

  const results = await db.select().from(barMenus).where(whereClause).limit(10);

  results.sort((a, b) => a.barName.length - b.barName.length || a.barName.localeCompare(b.barName));

  const menus = results.map((menu) => ({
    ...menu,
    items: normalizeMenuItems(menu.items),
  }));

  return NextResponse.json({ menus });
}
