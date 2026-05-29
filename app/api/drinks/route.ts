import { NextRequest, NextResponse } from "next/server";
import { db, drinks, sessions, barMenus, normalizeMenuItems } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { sanitizeDrinkName } from "@/lib/sanitize";
import { addDrinkSchema, patchDrinkSchema, parseBody } from "@/lib/schemas";

// GET drinks for a session
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Session expired or not found" }, { status: 404 });
  }

  const items = await db.select().from(drinks).where(eq(drinks.sessionId, session.id));

  return NextResponse.json({ drinks: items, sessionId: session.id });
}

// POST: add a new drink or increment existing
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(addDrinkSchema, body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { slug, name, category } = parsed.data;

  const cleanName = sanitizeDrinkName(name);
  if (!cleanName) return NextResponse.json({ error: "Invalid drink name" }, { status: 400 });

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Session expired" }, { status: 404 });
  }

  // Atomic upsert: increment if exists, insert if not
  const now = new Date().toISOString();
  const [existing] = await db
    .update(drinks)
    .set({
      count: sql`${drinks.count} + 1`,
      tappedAt: sql`${drinks.tappedAt} || ${JSON.stringify([now])}::jsonb`,
    })
    .where(and(eq(drinks.sessionId, session.id), sql`lower(${drinks.name}) = ${cleanName}`))
    .returning();

  if (existing) {
    return NextResponse.json({ count: existing.count });
  }

  const [drink] = await db
    .insert(drinks)
    .values({ sessionId: session.id, name: cleanName, category: category || null, tappedAt: [now] })
    .returning();

  // Add to bar menu if session has one and item isn't already in it
  if (session.barMenuId) {
    const [menu] = await db
      .select()
      .from(barMenus)
      .where(eq(barMenus.id, session.barMenuId))
      .limit(1);
    if (menu) {
      const currentItems = normalizeMenuItems(menu.items);
      if (
        currentItems.length < 200 &&
        !currentItems.some((item) => item.name.toLowerCase() === cleanName)
      ) {
        await db
          .update(barMenus)
          .set({ items: [...currentItems, { name: cleanName, category: category || "other" }] })
          .where(eq(barMenus.id, session.barMenuId));
      }
    }
  }

  return NextResponse.json({ drink });
}

// PATCH: increment or decrement (with session ownership check)
export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(patchDrinkSchema, body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { slug, drinkId, delta } = parsed.data;

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Session expired" }, { status: 404 });
  }

  const [drink] = await db
    .select()
    .from(drinks)
    .where(and(eq(drinks.id, drinkId), eq(drinks.sessionId, session.id)))
    .limit(1);

  if (!drink) return NextResponse.json({ error: "Drink not found" }, { status: 404 });

  if (delta === -1) {
    // Atomic: delete if count <= 1, otherwise decrement
    const deleted = await db
      .delete(drinks)
      .where(and(eq(drinks.id, drinkId), sql`${drinks.count} <= 1`))
      .returning();
    if (deleted.length > 0) {
      return NextResponse.json({ deleted: true });
    }
    await db
      .update(drinks)
      .set({
        count: sql`${drinks.count} - 1`,
        tappedAt: sql`${drinks.tappedAt} - (jsonb_array_length(${drinks.tappedAt}) - 1)`,
      })
      .where(and(eq(drinks.id, drinkId), sql`${drinks.count} > 1`));
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  await db
    .update(drinks)
    .set({
      count: sql`${drinks.count} + 1`,
      tappedAt: sql`${drinks.tappedAt} || ${JSON.stringify([now])}::jsonb`,
    })
    .where(eq(drinks.id, drinkId));

  return NextResponse.json({ ok: true });
}
