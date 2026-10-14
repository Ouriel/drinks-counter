import { timingSafeEqual } from "crypto";

export function verifySecret(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
