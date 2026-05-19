import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getVisionModel } from "@/lib/ai";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export async function POST(req: NextRequest) {
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
            category: z.enum(["beer", "cocktail", "wine", "spirit", "soft", "food", "other"]),
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
- Return the GENERIC TYPE of drink, not the brand name. Example: "blonde beer" instead of "Kronenbourg", "IPA" instead of "Marguerite IPA", "white wine" instead of "Chardonnay"
- If a brand is well-known and IS the drink name (like "Corona", "Guinness"), keep it
- Split combo items into separate entries (e.g. "Coca, Ice Tea, Limonade" → 3 separate items)
- Use lowercase names
- Keep names short (2-4 words max)
- Category must be one of: beer, cocktail, wine, spirit, soft, food, other
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
    return NextResponse.json({ items: [], error: msg }, { status: 200 });
  }
}
