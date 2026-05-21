import { NextRequest, NextResponse } from "next/server";
import { db, tables, sessions, drinks } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { generateNickname } from "@/lib/nicknames";
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
  const taken = new Set(existing.map((entry) => entry.nickname));
  for (let i = 0; i < 10; i++) {
    const nick = generateNickname();
    if (!taken.has(nick)) return nick;
  }
  // Fallback: append count to avoid collision
  const base = generateNickname();
  return `${base} ${taken.size + 1}`;
}

// POST: create a table and link current session
export async function POST(req: NextRequest) {
  const body = await req.json();
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
  const body = await req.json();
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
  await db.update(sessions).set({ tableId: table.id, nickname }).where(eq(sessions.id, session.id));

  return NextResponse.json({ code: table.code, nickname });
}

// GET: read-only ranking (no slugs exposed)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const [table] = await db
    .select()
    .from(tables)
    .where(eq(tables.code, code.toUpperCase()))
    .limit(1);
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const members = await db
    .select({
      nickname: sessions.nickname,
      total: sql<number>`COALESCE(SUM(${drinks.count}), 0)`,
    })
    .from(sessions)
    .leftJoin(drinks, eq(drinks.sessionId, sessions.id))
    .where(eq(sessions.tableId, table.id))
    .groupBy(sessions.id, sessions.nickname)
    .orderBy(sql`COALESCE(SUM(${drinks.count}), 0) DESC`);

  return NextResponse.json({
    code: table.code,
    members: members.map((m) => ({ nickname: m.nickname || "???", total: Number(m.total) })),
  });
}
