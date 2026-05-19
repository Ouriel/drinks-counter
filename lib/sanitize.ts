const MAX_BAR_NAME_LENGTH = 100;
const MAX_DRINK_NAME_LENGTH = 80;

export function sanitizeBarName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_BAR_NAME_LENGTH);
}

export function sanitizeDrinkName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, MAX_DRINK_NAME_LENGTH);
}
