import {
  Beer,
  Wine,
  Martini,
  GlassWater,
  FlaskRound,
  Citrus,
  CupSoda,
  Pizza,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Category → lucide icon. Emoji (lib/constants CATEGORY_EMOJI) is kept only for
// the externally shared text recap; the UI uses these icons for a cleaner look.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  beer: Beer,
  wine: Wine,
  cocktail: Martini,
  spirit: GlassWater,
  shot: FlaskRound,
  mocktail: Citrus,
  soft: CupSoda,
  food: Pizza,
  other: Sparkles,
};

export function CategoryIcon({
  category,
  className = "w-4 h-4",
}: {
  category: string | null;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category || "other"] || Sparkles;
  return <Icon className={className} />;
}
