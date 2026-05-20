import { NextRequest, NextResponse } from "next/server";
import { db, sessions } from "@/lib/db";
import { lt } from "drizzle-orm";
import { verifySecret } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!verifySecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });

  return NextResponse.json({ deleted: result.length });
}
