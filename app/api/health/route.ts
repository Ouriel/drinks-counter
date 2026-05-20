import { NextResponse } from "next/server";
import { db, sessions } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db
      .select({ ok: sql`1` })
      .from(sessions)
      .limit(1);
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
