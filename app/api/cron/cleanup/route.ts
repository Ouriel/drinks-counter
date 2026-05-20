import { NextRequest, NextResponse } from "next/server";
import { db, sessions, tables } from "@/lib/db";
import { lt, sql } from "drizzle-orm";
import { verifySecret } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!verifySecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });

  // Clean up orphaned tables (no sessions referencing them)
  const orphaned = await db
    .delete(tables)
    .where(
      sql`${tables.id} NOT IN (SELECT DISTINCT ${sessions.tableId} FROM ${sessions} WHERE ${sessions.tableId} IS NOT NULL)`
    )
    .returning({ id: tables.id });

  return NextResponse.json({ deletedSessions: result.length, deletedTables: orphaned.length });
}
