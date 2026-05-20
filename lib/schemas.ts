import { z } from "zod";

export const createSessionSchema = z.object({
  barName: z.string().max(100).nullable().optional(),
  menuItems: z
    .array(
      z.union([
        z.string().max(100),
        z.object({ name: z.string().max(100), category: z.string().max(20) }),
      ])
    )
    .max(200)
    .optional(),
  slug: z.string().max(50).optional(),
});

export const addDrinkSchema = z.object({
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  category: z.string().max(20).optional(),
});

export const patchDrinkSchema = z.object({
  slug: z.string().min(1).max(50),
  drinkId: z.string().uuid(),
  delta: z.union([z.literal(1), z.literal(-1)]),
});

export const adminPatchSchema = z.object({
  id: z.string().uuid(),
  items: z
    .array(z.object({ name: z.string().max(100), category: z.string().max(20) }))
    .max(200)
    .optional(),
  barName: z.string().max(100).optional(),
});

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0]?.message || "Invalid request body" };
  }
  return { data: result.data };
}
