import { NextRequest, NextResponse } from "next/server";
import { db, sessions, barMenus } from "@/lib/db";
import { generateSlug } from "@/lib/slugs";
import { eq } from "drizzle-orm";

function sanitizeBarName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export async function POST(req: NextRequest) {
  const { barName, menuItems } = await req.json();

  let barMenuId: string | null = null;

  if (barName) {
    const cleanName = sanitizeBarName(barName);
    if (!cleanName) return NextResponse.json({ error: "Invalid bar name" }, { status: 400 });

    const existing = await db
      .select()
      .from(barMenus)
      .where(eq(barMenus.barName, cleanName))
      .limit(1);

    if (existing.length) {
      barMenuId = existing[0].id;
      // Update items if new ones provided and bar had none
      if (menuItems?.length && existing[0].items.length === 0) {
        await db.update(barMenus).set({ items: menuItems }).where(eq(barMenus.id, existing[0].id));
      }
    } else {
      const [menu] = await db
        .insert(barMenus)
        .values({ barName: cleanName, items: menuItems || [] })
        .returning();
      barMenuId = menu.id;
    }
  }

  // Retry slug generation on collision
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    try {
      const [session] = await db
        .insert(sessions)
        .values({ slug, barMenuId, expiresAt })
        .returning();
      return NextResponse.json({ slug: session.slug });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) continue;
      throw e;
    }
  }

  return NextResponse.json({ error: "Could not generate unique session" }, { status: 500 });
}

// GET session info (menu items for picker)
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Session expired or not found" }, { status: 404 });
  }

  let menuItems: string[] = [];
  if (session.barMenuId) {
    const [menu] = await db
      .select()
      .from(barMenus)
      .where(eq(barMenus.id, session.barMenuId))
      .limit(1);
    if (menu) menuItems = menu.items;
  }

  return NextResponse.json({ session: { id: session.id, slug: session.slug }, menuItems });
}
