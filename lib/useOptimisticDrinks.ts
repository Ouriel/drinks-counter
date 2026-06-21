import { useState, useRef, useCallback } from "react";
import { toast } from "@heroui/react";
import { getBadgeForCount, getNudge, checkPersonalBest } from "@/lib/gamification";
import { api } from "@/lib/api";
import type { Drink } from "@/lib/types";

// Minimal shape of the next-intl translator the hook needs (key + optional ICU values).
type Translate = (key: string, values?: Record<string, string | number>) => string;

function vibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
}

const NUDGE_KEY: Record<string, string> = { water: "water", taxi: "taxi", info: "sleep" };

function notifyGamification(
  translate: Translate,
  newTotal: number,
  prevTotal: number,
  addedCategory?: string | null
): boolean {
  const badge = getBadgeForCount(newTotal);
  if (badge) {
    toast(`${badge.emoji} ${translate(`badges.${badge.key}`)}`, {
      description: translate(`badges.${badge.key}Sub`),
      timeout: 15000,
    });
  }
  const isPersonalBest = checkPersonalBest(newTotal);
  if (isPersonalBest && !badge) {
    toast(`🏅 ${translate("toast.personalBest")}`, {
      description: translate("toast.personalBestDesc", { count: newTotal }),
      timeout: 15000,
    });
  }
  const nudge = getNudge(newTotal, prevTotal, addedCategory);
  if (nudge) {
    toast(`${nudge.emoji} ${translate(`nudges.${NUDGE_KEY[nudge.type]}`)}`, { timeout: 15000 });
  }
  return !!badge || isPersonalBest;
}

export function useOptimisticDrinks(
  slug: string,
  translate: Translate,
  onBadge?: () => void,
  initialDrinks: Drink[] = []
) {
  const [drinks, setDrinks] = useState<Drink[]>(initialDrinks);
  const totalRef = useRef(initialDrinks.reduce((sum, drink) => sum + drink.count, 0));
  const pendingOps = useRef(0);

  const fetchDrinks = useCallback(async () => {
    const data = await api.getDrinks(slug);
    if (data && pendingOps.current === 0) setDrinks(data.drinks);
  }, [slug]);

  function triggerGamification(newTotal: number, category?: string | null) {
    const earned = notifyGamification(translate, newTotal, totalRef.current, category);
    totalRef.current = newTotal;
    if (earned && onBadge) onBadge();
  }

  /** Rollback a drink to its previous count, or re-insert if it was removed */
  function rollback(drink: Drink, prevCount: number) {
    setDrinks((prev) => {
      const exists = prev.find((item) => item.id === drink.id);
      if (exists)
        return prev.map((item) => (item.id === drink.id ? { ...item, count: prevCount } : item));
      return [...prev, { ...drink, count: prevCount }];
    });
  }

  async function withPendingOp(fn: () => Promise<void>) {
    pendingOps.current++;
    try {
      await fn();
    } finally {
      pendingOps.current--;
      if (pendingOps.current === 0) fetchDrinks();
    }
  }

  async function addDrink(name: string, category?: string) {
    vibrate();
    const existing = drinks.find((item) => item.name.toLowerCase() === name.toLowerCase());

    // Optimistic update
    if (existing) {
      setDrinks((prev) =>
        prev.map((item) => (item.id === existing.id ? { ...item, count: item.count + 1 } : item))
      );
    } else {
      setDrinks((prev) => [
        ...prev,
        { id: `temp-${crypto.randomUUID()}`, name, count: 1, category: category || null },
      ]);
    }
    triggerGamification(totalRef.current + 1, category);

    await withPendingOp(async () => {
      const data = await api.addDrink({ slug, name, category });
      if (!data) {
        totalRef.current = Math.max(0, totalRef.current - 1);
        fetchDrinks();
        return;
      }

      if (!existing && "drink" in data) {
        setDrinks((prev) =>
          prev.map((item) =>
            item.name.toLowerCase() === name.toLowerCase() && item.id.startsWith("temp")
              ? { ...item, id: data.drink.id }
              : item
          )
        );
      }
    });
  }

  async function increment(drink: Drink) {
    vibrate();
    setDrinks((prev) =>
      prev.map((item) => (item.id === drink.id ? { ...item, count: item.count + 1 } : item))
    );
    triggerGamification(totalRef.current + 1, drink.category);

    await withPendingOp(async () => {
      const data = await api.addDrink({
        slug,
        name: drink.name,
        category: drink.category || undefined,
      });
      if (!data) {
        totalRef.current = Math.max(0, totalRef.current - 1);
        setDrinks((prev) =>
          prev.map((item) => (item.id === drink.id ? { ...item, count: item.count - 1 } : item))
        );
      }
    });
  }

  async function decrement(drink: Drink) {
    vibrate();
    const prevCount = drink.count;
    totalRef.current = Math.max(0, totalRef.current - 1);

    // Optimistic: remove or decrement
    if (drink.count <= 1) {
      setDrinks((prev) => prev.filter((item) => item.id !== drink.id));
    } else {
      setDrinks((prev) =>
        prev.map((item) => (item.id === drink.id ? { ...item, count: item.count - 1 } : item))
      );
    }

    await withPendingOp(async () => {
      const data = await api.patchDrink({ slug, drinkId: drink.id, delta: -1 });
      if (!data) rollback(drink, prevCount);
    });
  }

  return { drinks, setDrinks, totalRef, addDrink, increment, decrement };
}
