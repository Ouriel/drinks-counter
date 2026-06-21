import type { Drink } from "@/lib/types";
import { isAlcoholic } from "@/lib/constants";

type DrinkLike = Pick<Drink, "name" | "count" | "category" | "createdAt">;

// === MILESTONE BADGES ===

export type Badge = { emoji: string; title: string; subtitle: string };

export const MILESTONES: [number, Badge][] = [
  [1, { emoji: "🍼", title: "And So It Begins", subtitle: "No turning back now" }],
  [2, { emoji: "🐣", title: "Warming Up", subtitle: "Just getting loose" }],
  [3, { emoji: "🎯", title: "Hat-Trick", subtitle: "Three and thriving" }],
  [5, { emoji: "🔥", title: "On a Roll", subtitle: "Who's counting? Oh right, we are" }],
  [7, { emoji: "🎢", title: "No Brakes", subtitle: "Weeeee" }],
  [10, { emoji: "👑", title: "Double Digits", subtitle: "Officially a legend" }],
  [13, { emoji: "😈", title: "Bad Idea Incoming", subtitle: "This felt smart 12 drinks ago" }],
  [15, { emoji: "🚀", title: "Liftoff", subtitle: "Houston, we have a party" }],
  [20, { emoji: "☠️", title: "No Regrets", subtitle: "Tomorrow is a problem for tomorrow" }],
  [25, { emoji: "🧟", title: "The Undead", subtitle: "Still vertical, technically" }],
  [30, { emoji: "🪦", title: "Here Lies Tomorrow", subtitle: "RIP your morning" }],
];

export function getBadgeForCount(total: number): Badge | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (total === MILESTONES[i][0]) return MILESTONES[i][1];
  }
  return null;
}

export function getAllEarnedBadges(total: number): Badge[] {
  return MILESTONES.filter(([threshold]) => total >= threshold).map(([, badge]) => badge);
}

// === COLOR SHIFT ===

export function getSessionHue(total: number, isDark = true): string {
  // Cool (blue 210) → warm (amber 30) as drinks increase, capped at 20
  const t = Math.min(total, 20) / 20;
  const hue = Math.round(210 - t * 180); // 210 → 30
  const saturation = Math.round(30 + t * 50); // 30% → 80%
  const lightness = isDark ? 10 + t * 5 : 94 - t * 6; // dark: 10→15%, light: 94→88%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Icon tint: amber by default, shifting toward deep orange/red as drinks add up.
// Tuned for legibility in both themes (darker in light mode, brighter in dark mode).
export function getIconColor(total: number, isDark = true): string {
  const t = Math.min(total, 20) / 20;
  const hue = Math.round(45 - t * 33); // 45 (amber) → 12 (deep orange)
  const saturation = Math.round(90 + t * 8); // 90% → 98%
  const lightness = isDark ? 58 - t * 8 : 45 - t * 8; // dark: 58→50%, light: 45→37%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/** Progressive visual effects based on drink count */
export function getTipsyStyle(total: number): React.CSSProperties {
  if (total < 3) return {};
  if (total < 7) {
    return { transform: `rotate(${(total - 3) * 0.3}deg)` };
  }
  if (total < 12) {
    const offset = (total - 6) * 0.4;
    return {
      transform: `rotate(${total % 2 === 0 ? 1.2 : -1.2}deg)`,
      textShadow: `${offset}px ${offset * 0.5}px 0 rgba(128,128,128,0.25)`,
    };
  }
  const offset = 1.5 + (total - 11) * 0.3;
  return {
    transform: `rotate(${total % 2 === 0 ? 1.8 : -1.8}deg)`,
    textShadow: `${offset}px ${offset * 0.5}px 0 rgba(128,128,128,0.35)`,
  };
}

// === PACE INDICATOR ===

export type Pace = { emoji: string; label: string; dph: number };

// Drinks-per-hour thresholds, tuned so most real sessions (≈0.5–3/h) land across the
// lower bands and only genuinely heavy paces (>3.2/h) reach the top tier.
export const PACE_LEVELS: { maxDph: number; emoji: string; label: string }[] = [
  { maxDph: 0.4, emoji: "🐢", label: "Nursing It" },
  { maxDph: 0.8, emoji: "🐌", label: "Taking It Slow" },
  { maxDph: 1.2, emoji: "😌", label: "Cruising" },
  { maxDph: 1.6, emoji: "🍺", label: "Social Pace" },
  { maxDph: 2, emoji: "🏃", label: "Picking It Up" },
  { maxDph: 2.4, emoji: "🚀", label: "Sending It" },
  { maxDph: 2.8, emoji: "🔥", label: "On A Mission" },
  { maxDph: 3.2, emoji: "🌪️", label: "Off The Rails" },
  { maxDph: Infinity, emoji: "☄️", label: "Send Help" },
];

export function getPace(drinks: DrinkLike[]): Pace | null {
  const firstDrink = drinks.reduce<string | null>(
    (earliest, drink) =>
      !earliest || (drink.createdAt && drink.createdAt < earliest)
        ? drink.createdAt || earliest
        : earliest,
    null
  );
  if (!firstDrink) return null;
  const hours = (Date.now() - new Date(firstDrink).getTime()) / 3_600_000;
  if (hours < 0.08) return null; // less than 5 min
  const total = drinks.reduce((sum, drink) => sum + drink.count, 0);
  const dph = total / hours;
  const level =
    PACE_LEVELS.find((entry) => dph <= entry.maxDph) ?? PACE_LEVELS[PACE_LEVELS.length - 1];
  return { emoji: level.emoji, label: level.label, dph: Math.round(dph * 10) / 10 };
}

// === DRINK-SPECIFIC ACHIEVEMENTS ===

export type Achievement = {
  emoji: string;
  text: string;
  key: string;
  params?: Record<string, string>;
};

export function getDrinkAchievements(drinks: DrinkLike[]): Achievement[] {
  const achievements: Achievement[] = [];
  const categories = new Set(drinks.map((drink) => drink.category || "other"));
  const uniqueDrinks = drinks.length;
  const total = drinks.reduce((sum, d) => sum + d.count, 0);

  if (categories.size >= 4) {
    achievements.push({ emoji: "🌈", text: "Rainbow drinker — 4+ categories!", key: "rainbow" });
  }
  if (categories.size >= 7) {
    achievements.push({
      emoji: "🏆",
      text: "Category master — tried almost everything!",
      key: "categoryMaster",
    });
  }
  if (uniqueDrinks >= 5) {
    achievements.push({ emoji: "🧭", text: "Explorer — 5+ different drinks", key: "explorer" });
  }
  if (uniqueDrinks >= 10) {
    achievements.push({
      emoji: "🗺️",
      text: "Adventurer — 10+ different drinks!",
      key: "adventurer",
    });
  }

  // Designated driver: 3+ drinks, none alcoholic. Hydration hero: had alcohol but
  // also 3+ non-alcoholic drinks (stayed watered). Mutually exclusive.
  const nonAlcoholicTotal = drinks.reduce(
    (sum, drink) => sum + (isAlcoholic(drink.category) ? 0 : drink.count),
    0
  );
  const alcoholicTotal = total - nonAlcoholicTotal;
  const foodTotal = drinks.reduce(
    (sum, drink) => sum + (drink.category === "food" ? drink.count : 0),
    0
  );
  const nonAlcoholicDrinks = nonAlcoholicTotal - foodTotal; // non-alcoholic, food excluded
  const drinkTotal = total - foodTotal; // drinks only (no food)
  if (drinkTotal >= 3 && alcoholicTotal === 0) {
    achievements.push({
      emoji: "🧃",
      text: "Designated driver — all alcohol-free, respect!",
      key: "designatedDriver",
    });
  } else if (alcoholicTotal > 0 && nonAlcoholicDrinks >= 3) {
    achievements.push({
      emoji: "💧",
      text: "Hydration hero — kept the water flowing",
      key: "hydrationHero",
    });
  }

  // Food: lining your stomach (good) vs drinking on an empty stomach (a classic mistake)
  if (foodTotal > 0) {
    achievements.push({
      emoji: "🍔",
      text: "Lined the stomach — you actually ate",
      key: "ateFood",
    });
  } else if (alcoholicTotal >= 5) {
    achievements.push({
      emoji: "🍟",
      text: "Liquid dinner — who needs food anyway",
      key: "noFood",
    });
  }

  // Signature drink: one drink with 4+ count
  const signature = drinks.find((drink) => drink.count >= 4);
  if (signature) {
    achievements.push({
      emoji: "⭐",
      text: `Signature: ${signature.name}`,
      key: "signature",
      params: { name: signature.name },
    });
  }

  // Loyal: same drink 7+ times
  const loyal = drinks.find((drink) => drink.count >= 7);
  if (loyal) {
    achievements.push({
      emoji: "💎",
      text: `Devoted to ${loyal.name}`,
      key: "devoted",
      params: { name: loyal.name },
    });
  }

  // Wildcard: never ordered same drink twice (all counts = 1)
  if (uniqueDrinks >= 4 && drinks.every((drink) => drink.count === 1)) {
    achievements.push({
      emoji: "🎲",
      text: "Wildcard — never the same drink twice!",
      key: "wildcard",
    });
  }

  // Escalation: started with beer, ended with spirit/cocktail
  const sorted = [...drinks].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  if (sorted.length >= 2) {
    const firstCat = sorted[0].category || "other";
    const lastCat = sorted[sorted.length - 1].category || "other";
    if (
      (firstCat === "beer" || firstCat === "soft") &&
      (lastCat === "spirit" || lastCat === "cocktail" || lastCat === "shot")
    ) {
      achievements.push({
        emoji: "📈",
        text: "Escalation — started light, ended strong",
        key: "escalation",
      });
    }
  }

  // Time-based
  const firstDrink = drinks.reduce<string | null>(
    (earliest, drink) =>
      !earliest || (drink.createdAt && drink.createdAt < earliest)
        ? drink.createdAt || earliest
        : earliest,
    null
  );
  const lastDrink = drinks.reduce<string | null>(
    (latest, drink) =>
      !latest || (drink.createdAt && drink.createdAt > latest) ? drink.createdAt || latest : latest,
    null
  );

  if (lastDrink) {
    const lastHour = new Date(lastDrink).getHours();
    if (lastHour >= 0 && lastHour < 5) {
      achievements.push({
        emoji: "🌙",
        text: "Night Owl — still going past midnight",
        key: "nightOwl",
      });
    }
  }

  if (firstDrink && lastDrink) {
    const durationH = (new Date(lastDrink).getTime() - new Date(firstDrink).getTime()) / 3_600_000;
    if (durationH >= 4) {
      achievements.push({ emoji: "🐌", text: "Savoring It — 4+ hour session", key: "savoring" });
    }
  }

  // Speed Round: 3+ drinks in under 30 min
  if (firstDrink && lastDrink && total >= 3) {
    const durationMin = (new Date(lastDrink).getTime() - new Date(firstDrink).getTime()) / 60_000;
    if (durationMin <= 30) {
      achievements.push({
        emoji: "⚡",
        text: "Speed Round — 3+ drinks in 30 min",
        key: "speedRound",
      });
    }
  }

  // Happy hour: started in the late afternoon / early evening (4–7pm)
  if (firstDrink) {
    const firstHour = new Date(firstDrink).getHours();
    if (firstHour >= 16 && firstHour < 19) {
      achievements.push({
        emoji: "🕔",
        text: "Happy hour hero — started before 7pm",
        key: "happyHour",
      });
    }
  }

  // Liver warning: serious volume
  if (total >= 20) {
    achievements.push({
      emoji: "🫁",
      text: "Your liver filed a complaint",
      key: "liverWarning",
    });
  }

  return achievements;
}

// === PERSONAL BEST ===

const PB_KEY = "tipsytap_personal_best";

export function getPersonalBest(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(PB_KEY) || "0", 10);
}

export function checkPersonalBest(total: number): boolean {
  const pb = getPersonalBest();
  if (total > pb && total > 0) {
    localStorage.setItem(PB_KEY, String(total));
    return true;
  }
  return false;
}

// === LIGHTHEARTED NUDGES ===

export type Nudge = { emoji: string; text: string; type: "water" | "taxi" | "info" };

export function getNudge(
  total: number,
  prevTotal: number,
  addedCategory?: string | null
): Nudge | null {
  // Water reminder every 3 drinks — skip it when the drink just added was already
  // non-alcoholic or food (no point nagging someone who is hydrating / eating).
  const justWentSoft = addedCategory != null && !isAlcoholic(addedCategory);
  if (total > 0 && total % 3 === 0 && total !== prevTotal && !justWentSoft) {
    return { emoji: "💧", text: "Water break?", type: "water" };
  }
  // Taxi nudge at 8
  if (total === 8 && prevTotal < 8) {
    return { emoji: "🚕", text: "Maybe save that taxi number", type: "taxi" };
  }
  // At 12
  if (total === 12 && prevTotal < 12) {
    return { emoji: "🛏️", text: "Future you says thanks for stopping soon", type: "info" };
  }
  return null;
}
