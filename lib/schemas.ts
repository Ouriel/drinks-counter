import { z } from "zod";

const RESERVED_PATHS = ["admin", "stats", "api", "s", "health", "_next", "favicon.ico"];

const slugField = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes")
  .refine((s) => !RESERVED_PATHS.includes(s), "Reserved path");

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
  slug: z
    .string()
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Invalid slug format")
    .optional(),
});

export const addDrinkSchema = z.object({
  slug: slugField,
  name: z.string().min(1).max(100),
  category: z.string().max(20).optional(),
});

export const patchDrinkSchema = z.object({
  slug: slugField,
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
