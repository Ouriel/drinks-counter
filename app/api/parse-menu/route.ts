import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getVisionModel } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("photo") as File;
  if (!file) return NextResponse.json({ error: "No photo" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

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
              image: `data:${file.type};base64,${base64}`,
            },
            {
              type: "text",
              text: "Extract all drinks and food items from this bar/restaurant menu photo. Return each item with its name (short, clean) and category. Ignore prices, descriptions, and decorative text.",
            },
          ],
        },
      ],
    });

    return NextResponse.json(object);
  } catch (e) {
    console.error("Menu parsing failed:", e);
    return NextResponse.json({ items: [], error: "Could not parse menu" }, { status: 200 });
  }
}
