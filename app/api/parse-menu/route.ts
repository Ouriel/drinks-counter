import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getVisionModel } from "@/lib/ai";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

// Simple in-memory rate limiter: max 5 requests per IP per minute
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Periodic cleanup: remove expired entries
  if (rateMap.size > 100) {
    for (const [key, entry] of rateMap) {
      if (now > entry.resetAt) rateMap.delete(key);
    }
  }
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }
  const formData = await req.formData();
  const file = formData.get("photo") as File;
  if (!file) return NextResponse.json({ error: "No photo" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();

  try {
    const { object } = await generateObject({
      model: getVisionModel(),
      schema: z.object({
        items: z.array(
          z.object({
            name: z.string(),
            category: z.enum([
              "beer",
              "cocktail",
              "wine",
              "spirit",
              "shot",
              "mocktail",
              "soft",
              "food",
              "other",
            ]),
          })
        ),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: new Uint8Array(bytes),
              mediaType: file.type,
            },
            {
              type: "text",
              text: `Extract all drinks and food items from this bar/restaurant menu photo.

Rules:
- Use the generic type when there's only ONE of that kind (e.g. just "blonde beer" if there's only one blonde beer)
- KEEP the brand/name when there are MULTIPLE variants of the same type (e.g. if there are 3 IPAs, keep "Marguerite IPA", "Punk IPA", "Lagunitas IPA")
- Include supplements and extras (e.g. "picon", "sirop", "grenadine") as separate items — these are small add-ons often listed in smaller text
- Split combo items into separate entries (e.g. "Coca, Ice Tea, Limonade" → 3 separate items)
- Use lowercase names
- Keep names short (2-4 words max)
- Category must be one of: beer, cocktail, wine, spirit, shot, mocktail, soft, food, other
- "mocktail" = non-alcoholic cocktails (virgin drinks, alcohol-free mixes)
- "shot" = small 2-4cl drinks meant to be downed in one go (Jägerbomb, tequila shot, B52, etc.)
- "spirit" = neat spirits served in a tumbler (whiskey, rum, vodka neat, digestifs)
- Ignore prices, descriptions, and decorative text`,
            },
          ],
        },
      ],
    });

    return NextResponse.json(object);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Menu parsing failed:", msg);
    return NextResponse.json({ error: "Menu parsing failed", items: [] }, { status: 500 });
  }
}
