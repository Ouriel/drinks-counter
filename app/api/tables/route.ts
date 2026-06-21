import { NextRequest, NextResponse } from "next/server";
import { db, tables, sessions, drinks } from "@/lib/db";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";
import { pickUniqueNickname } from "@/lib/nicknames";
import { parseBody } from "@/lib/schemas";

const createTableSchema = z.object({ slug: z.string().min(1).max(50) });
const joinTableSchema = z.object({
  slug: z.string().min(1).max(50),
  code: z.string().min(1).max(6),
});

function generateTableCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function uniqueNicknameForTable(tableId: string): Promise<string> {
  const existing = await db
    .select({ nickname: sessions.nickname })
    .from(sessions)
    .where(eq(sessions.tableId, tableId));
  const taken = new Set(existing.map((entry) => entry.nickname).filter(Boolean) as string[]);
  return pickUniqueNickname(taken);
}

// POST: create a table and link current session
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(createTableSchema, body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { slug } = parsed.data;

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.tableId) {
    return NextResponse.json({ error: "Already in a table" }, { status: 409 });
  }

  // Retry loop for unique code
  for (let i = 0; i < 5; i++) {
    const code = generateTableCode();
    try {
      const [table] = await db.insert(tables).values({ code }).returning();
      const nickname = await uniqueNicknameForTable(table.id);
      await db
        .update(sessions)
        .set({ tableId: table.id, nickname })
        .where(eq(sessions.id, session.id));
      return NextResponse.json({ code: table.code, nickname });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) continue;
      throw e;
    }
  }

  return NextResponse.json({ error: "Could not create table" }, { status: 500 });
}

// PATCH: join an existing table
export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(joinTableSchema, body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { slug, code } = parsed.data;

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.tableId) {
    return NextResponse.json({ error: "Already in a table" }, { status: 409 });
  }

  const [table] = await db
    .select()
    .from(tables)
    .where(eq(tables.code, code.toUpperCase()))
    .limit(1);
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const nickname = await uniqueNicknameForTable(table.id);
  // Inherit bar menu from existing table members
  const [existingMember] = await db
    .select({ barMenuId: sessions.barMenuId })
    .from(sessions)
    .where(eq(sessions.tableId, table.id))
    .limit(1);
  const barMenuId = existingMember?.barMenuId ?? null;

  await db
    .update(sessions)
    .set({ tableId: table.id, nickname, ...(barMenuId && { barMenuId }) })
    .where(eq(sessions.id, session.id));

  return NextResponse.json({ code: table.code, nickname });
}

// PUT: re-roll the current session's nickname to a new unique one in its table
export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(createTableSchema, body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { slug } = parsed.data;

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!session.tableId) return NextResponse.json({ error: "Not in a table" }, { status: 400 });

  const nickname = await uniqueNicknameForTable(session.tableId);
  await db.update(sessions).set({ nickname }).where(eq(sessions.id, session.id));

  return NextResponse.json({ nickname });
}

// GET: read-only ranking (no slugs exposed) + member drinks
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const slug = req.nextUrl.searchParams.get("slug");
  if (!code && !slug) {
    return NextResponse.json({ error: "Missing code or slug" }, { status: 400 });
  }

  // Resolve the table from a code (public) or from a session slug (private, one round-trip).
  let table: typeof tables.$inferSelect | undefined;
  if (code) {
    [table] = await db.select().from(tables).where(eq(tables.code, code.toUpperCase())).limit(1);
  } else {
    const rows = await db
      .select()
      .from(sessions)
      .innerJoin(tables, eq(sessions.tableId, tables.id))
      .where(eq(sessions.slug, slug as string))
      .limit(1);
    table = rows[0]?.tables;
  }
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  // If nickname param is provided, return that member's drinks
  const memberNickname = req.nextUrl.searchParams.get("nickname");
  if (memberNickname) {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tableId, table.id), eq(sessions.nickname, memberNickname)))
      .limit(1);
    if (!session) return NextResponse.json({ drinks: [] });
    const memberDrinks = await db
      .select({ name: drinks.name, count: drinks.count, category: drinks.category })
      .from(drinks)
      .where(eq(drinks.sessionId, session.id))
      .orderBy(sql`${drinks.count} DESC`);
    return NextResponse.json({ drinks: memberDrinks });
  }

  // If stats param is provided, return aggregated table statistics
  if (req.nextUrl.searchParams.get("stats")) {
    const statsMembers = await db
      .select({
        nickname: sessions.nickname,
        total: sql<number>`COALESCE(SUM(${drinks.count}), 0)::int`,
      })
      .from(sessions)
      .leftJoin(drinks, eq(drinks.sessionId, sessions.id))
      .where(eq(sessions.tableId, table.id))
      .groupBy(sessions.id, sessions.nickname)
      .orderBy(sql`COALESCE(SUM(${drinks.count}), 0) DESC`, sessions.nickname);

    const byCategory = await db
      .select({
        category: drinks.category,
        count: sql<number>`SUM(${drinks.count})::int`,
      })
      .from(drinks)
      .innerJoin(sessions, eq(drinks.sessionId, sessions.id))
      .where(eq(sessions.tableId, table.id))
      .groupBy(drinks.category);

    const topDrinks = await db
      .select({
        name: drinks.name,
        category: drinks.category,
        count: sql<number>`SUM(${drinks.count})::int`,
      })
      .from(drinks)
      .innerJoin(sessions, eq(drinks.sessionId, sessions.id))
      .where(eq(sessions.tableId, table.id))
      .groupBy(drinks.name, drinks.category)
      .orderBy(sql`SUM(${drinks.count}) DESC`)
      .limit(8);

    const total = byCategory.reduce((sum, row) => sum + Number(row.count), 0);

    return NextResponse.json({
      code: table.code,
      total,
      members: statsMembers.map((member) => ({
        nickname: member.nickname || "???",
        total: Number(member.total),
      })),
      byCategory: byCategory.map((row) => ({
        category: row.category || "other",
        count: Number(row.count),
      })),
      topDrinks: topDrinks.map((row) => ({
        name: row.name,
        category: row.category,
        count: Number(row.count),
      })),
    });
  }

  const members = await db
    .select({
      nickname: sessions.nickname,
      total: sql<number>`COALESCE(SUM(${drinks.count}), 0)`,
    })
    .from(sessions)
    .leftJoin(drinks, eq(drinks.sessionId, sessions.id))
    .where(eq(sessions.tableId, table.id))
    .groupBy(sessions.id, sessions.nickname)
    .orderBy(sql`COALESCE(SUM(${drinks.count}), 0) DESC`, sessions.nickname);

  return NextResponse.json({
    code: table.code,
    members: members.map((m) => ({ nickname: m.nickname || "???", total: Number(m.total) })),
  });
}

// DELETE: leave a table
export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const [session] = await db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!session.tableId) return NextResponse.json({ error: "Not in a table" }, { status: 400 });

  await db
    .update(sessions)
    .set({ tableId: null, nickname: null })
    .where(eq(sessions.id, session.id));

  return NextResponse.json({ ok: true });
}
