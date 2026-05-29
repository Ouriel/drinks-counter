import { NextRequest, NextResponse } from "next/server";
import { db, sessions, barMenus, tables, normalizeMenuItems } from "@/lib/db";
import type { MenuItem } from "@/lib/types";
import { generateSlug } from "@/lib/slugs";
import { sanitizeBarName } from "@/lib/sanitize";
import { eq } from "drizzle-orm";
import { createSessionSchema, parseBody } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(createSessionSchema, body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { barName, menuItems, slug: preferredSlug } = parsed.data;

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
      if (menuItems?.length) {
        const currentItems = normalizeMenuItems(existing[0].items);
        const existingLower = new Set(currentItems.map((item) => item.name.toLowerCase()));
        const incoming: MenuItem[] = menuItems.map((item: MenuItem | string) =>
          typeof item === "string" ? { name: item, category: "other" } : item
        );
        const newItems = incoming.filter((item) => !existingLower.has(item.name.toLowerCase()));
        if (newItems.length > 0) {
          await db
            .update(barMenus)
            .set({ items: [...currentItems, ...newItems] })
            .where(eq(barMenus.id, existing[0].id));
        }
      }
    } else {
      const items: MenuItem[] = (menuItems || []).map((item: MenuItem | string) =>
        typeof item === "string" ? { name: item, category: "other" } : item
      );
      const [menu] = await db.insert(barMenus).values({ barName: cleanName, items }).returning();
      barMenuId = menu.id;
    }
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const slugsToTry = preferredSlug
    ? [preferredSlug, ...Array.from({ length: 4 }, () => generateSlug())]
    : Array.from({ length: 5 }, () => generateSlug());

  for (const slug of slugsToTry) {
    try {
      const [session] = await db
        .insert(sessions)
        .values({ slug, barMenuId, expiresAt })
        .returning();
      return NextResponse.json({ slug: session.slug });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        console.warn(`[sessions] Slug collision: "${slug}"`);
        continue;
      }
      throw e;
    }
  }

  console.error(`[sessions] All ${slugsToTry.length} slug attempts failed`);
  return NextResponse.json({ error: "Could not generate unique session" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Session expired or not found" }, { status: 404 });
  }

  const [menuResult, tableResult] = await Promise.all([
    session.barMenuId
      ? db.select().from(barMenus).where(eq(barMenus.id, session.barMenuId)).limit(1)
      : Promise.resolve([]),
    session.tableId
      ? db.select().from(tables).where(eq(tables.id, session.tableId)).limit(1)
      : Promise.resolve([]),
  ]);

  let menuItems: MenuItem[] = [];
  let barNameResult: string | null = null;
  if (menuResult[0]) {
    menuItems = normalizeMenuItems(menuResult[0].items);
    barNameResult = menuResult[0].barName;
  }

  const tableCode: string | null = tableResult[0]?.code ?? null;

  return NextResponse.json({
    session: {
      id: session.id,
      slug: session.slug,
      barName: barNameResult,
      tableCode,
      nickname: session.nickname,
    },
    menuItems,
  });
}
