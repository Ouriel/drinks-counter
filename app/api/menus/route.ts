import { NextRequest, NextResponse } from "next/server";
import { db, barMenus } from "@/lib/db";
import { sql } from "drizzle-orm";

// Sanitize bar name input: trim, lowercase, remove special chars, limit length
function sanitize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "") // keep letters, numbers, spaces, hyphens, apostrophes
    .replace(/\s+/g, " ") // collapse whitespace
    .trim() // trim again after removals
    .slice(0, 100); // max length
}

// Simple fuzzy matching: search with trigram-like approach
// Splits query into tokens and matches if all tokens appear in the bar name
function buildFuzzyCondition(query: string) {
  const sanitized = sanitize(query);
  if (!sanitized) return null;

  // Use PostgreSQL's ILIKE with wildcards around each token for fuzzy matching
  // Also use similarity via pg_trgm if available, fallback to multi-token ILIKE
  const tokens = sanitized.split(" ").filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;

  return tokens;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) return NextResponse.json({ menus: [] });

  const tokens = buildFuzzyCondition(q);
  if (!tokens) return NextResponse.json({ menus: [] });

  // Build a query where all tokens must match (AND logic with ILIKE)
  // This gives fuzzy-ish behavior: "le comptoir" matches "Le Comptoir Général"
  const conditions = tokens.map((t) => sql`bar_name ILIKE ${"%" + t + "%"}`);
  const whereClause = sql.join(conditions, sql` AND `);

  const results = await db.select().from(barMenus).where(whereClause).limit(10);

  // Sort by relevance: shorter names (closer match) first, then alphabetical
  results.sort((a, b) => a.barName.length - b.barName.length || a.barName.localeCompare(b.barName));

  return NextResponse.json({ menus: results });
}
