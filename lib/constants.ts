export const CATEGORY_EMOJI: Record<string, string> = {
  beer: "🍺",
  wine: "🍷",
  cocktail: "🍸",
  spirit: "🥃",
  shot: "🔥",
  mocktail: "🍹",
  soft: "🥤",
  food: "🍕",
  other: "🫧",
};

export const CATEGORIES = Object.keys(CATEGORY_EMOJI);

const ALCOHOLIC_CATEGORIES = new Set(["beer", "wine", "cocktail", "spirit", "shot"]);

/** Whether a drink category contains alcohol (soft, mocktail, food, other = false). */
export function isAlcoholic(category: string | null): boolean {
  return ALCOHOLIC_CATEGORIES.has(category || "");
}
