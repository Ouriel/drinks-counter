import type { Drink } from "@/lib/types";

type DrinkLike = Pick<Drink, "name" | "count" | "category" | "createdAt">;

// === MILESTONE BADGES ===

export type Badge = { emoji: string; title: string; subtitle: string };

const MILESTONES: [number, Badge][] = [
  [1, { emoji: "🍼", title: "First Sip", subtitle: "The night begins!" }],
  [3, { emoji: "🎯", title: "Hat Trick", subtitle: "You're warming up" }],
  [5, { emoji: "🔥", title: "On Fire", subtitle: "No stopping now" }],
  [7, { emoji: "🌊", title: "Deep End", subtitle: "You're in the zone" }],
  [10, { emoji: "👑", title: "Legend", subtitle: "Double digits!" }],
  [15, { emoji: "🚀", title: "To The Moon", subtitle: "Houston, we have a party" }],
  [20, { emoji: "☠️", title: "No Regrets", subtitle: "Tomorrow is a problem for tomorrow" }],
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

export type Pace = { emoji: string; label: string };

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
  if (dph <= 1) return { emoji: "🐢", label: "Chill" };
  if (dph <= 2) return { emoji: "🚶", label: "Steady" };
  if (dph <= 3) return { emoji: "🏃", label: "Brisk" };
  if (dph <= 5) return { emoji: "🚀", label: "Turbo" };
  return { emoji: "⚡", label: "Warp speed" };
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

export function getNudge(total: number, prevTotal: number): Nudge | null {
  // Water reminder every 3 drinks
  if (total > 0 && total % 3 === 0 && total !== prevTotal) {
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
