import { NextRequest, NextResponse } from "next/server";
import { db, sessions, barMenus, normalizeMenuItems } from "@/lib/db";
import { mergeMenuItems } from "@/lib/menu-items";
import type { MenuItem } from "@/lib/types";
import { generateSlug } from "@/lib/slugs";
import { sanitizeBarName } from "@/lib/sanitize";
import { and, eq, sql } from "drizzle-orm";
import { createSessionSchema, parseBody } from "@/lib/schemas";
import { getSessionView } from "@/lib/server-queries";

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

    const incoming: MenuItem[] = (menuItems || []).map((item: MenuItem | string) =>
      typeof item === "string" ? { name: item, category: "other" } : item
    );
    // Insert first: two first sessions of a new bar at once get one row (unique bar_name).
    const [created] = await db
      .insert(barMenus)
      .values({ barName: cleanName, items: mergeMenuItems([], incoming) })
      .onConflictDoNothing({ target: barMenus.barName })
      .returning({ id: barMenus.id });
    const existing = created
      ? []
      : await db.select().from(barMenus).where(eq(barMenus.barName, cleanName)).limit(1);

    if (created) {
      barMenuId = created.id;
    } else {
      barMenuId = existing[0].id;
      if (incoming.length) {
        const currentItems = normalizeMenuItems(existing[0].items);
        const newItems = mergeMenuItems(currentItems, incoming).slice(currentItems.length);
        if (newItems.length > 0) {
          // Atomic append: a concurrent append or an admin Empty since the read is never overwritten.
          await db
            .update(barMenus)
            .set({ items: sql`${barMenus.items} || ${JSON.stringify(newItems)}::jsonb` })
            .where(
              and(eq(barMenus.id, existing[0].id), sql`jsonb_array_length(${barMenus.items}) < 200`)
            );
        }
      }
    }
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const slugsToTry = preferredSlug
    ? [preferredSlug, ...Array.from({ length: 4 }, () => generateSlug())]
    : Array.from({ length: 5 }, () => generateSlug());

  for (const [attempt, slug] of slugsToTry.entries()) {
    const [session] = await db
      .insert(sessions)
      .values({ slug, barMenuId, expiresAt })
      .onConflictDoNothing({ target: sessions.slug })
      .returning();
    if (session) return NextResponse.json({ slug: session.slug });
    // Never log the slug: it is a live session's write key.
    console.warn(`[sessions] Slug collision (attempt ${attempt + 1} of ${slugsToTry.length})`);
  }

  console.error(`[sessions] All ${slugsToTry.length} slug attempts failed`);
  return NextResponse.json({ error: "Could not generate unique session" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const view = await getSessionView(slug);
  if (!view) {
    return NextResponse.json({ error: "Session expired or not found" }, { status: 404 });
  }
  return NextResponse.json(view);
}
