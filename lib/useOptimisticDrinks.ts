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
  slug: string,
  newTotal: number,
  prevTotal: number,
  addedCategory?: string | null
): boolean {
  const badge = getBadgeForCount(newTotal);
  const isPersonalBest = checkPersonalBest(newTotal, slug);
  if (badge) {
    const record = `🏅 ${translate("toast.personalBestDesc", { count: newTotal })}`;
    toast(`${badge.emoji} ${translate(`badges.${badge.key}`)}`, {
      description: [translate(`badges.${badge.key}Sub`), isPersonalBest && record]
        .filter(Boolean)
        .join(" · "),
      timeout: 10000,
      indicator: null, // the emoji is the icon
    });
  }
  if (isPersonalBest && !badge) {
    toast(`🏅 ${translate("toast.personalBest")}`, {
      description: translate("toast.personalBestDesc", { count: newTotal }),
      timeout: 10000,
      indicator: null,
    });
  }
  const nudge = getNudge(newTotal, prevTotal, addedCategory);
  if (nudge) {
    toast(`${nudge.emoji} ${translate(`nudges.${NUDGE_KEY[nudge.type]}`)}`, {
      timeout: 10000,
      indicator: null,
    });
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
  const initialTotal = initialDrinks.reduce((sum, drink) => sum + drink.count, 0);
  const totalRef = useRef(initialTotal);
  const peakRef = useRef(initialTotal); // highest total on this page
  const pendingOps = useRef(0);

  const fetchDrinks = useCallback(async () => {
    const data = await api.getDrinks(slug);
    if (data && pendingOps.current === 0) setDrinks(data.drinks);
  }, [slug]);

  function triggerGamification(newTotal: number, category?: string | null) {
    // Only a new high fires badges, nudges and the PB, so undo + re-tap stays quiet.
    const earned =
      newTotal > peakRef.current &&
      notifyGamification(translate, slug, newTotal, peakRef.current, category);
    peakRef.current = Math.max(peakRef.current, newTotal);
    totalRef.current = newTotal;
    if (earned && onBadge) onBadge();
  }

  function tapFailed() {
    toast.danger(translate("toast.tapFailed"), { timeout: 2000 });
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
        tapFailed();
        totalRef.current = Math.max(0, totalRef.current - 1);
        setDrinks((prev) =>
          existing
            ? prev.map((item) =>
                item.id === existing.id ? { ...item, count: item.count - 1 } : item
              )
            : prev.filter((item) => !(item.id.startsWith("temp") && item.name === name))
        );
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
        tapFailed();
        totalRef.current = Math.max(0, totalRef.current - 1);
        setDrinks((prev) =>
          prev.map((item) => (item.id === drink.id ? { ...item, count: item.count - 1 } : item))
        );
      }
    });
  }

  async function decrement(drink: Drink) {
    // ponytail: undo is ignored until the add's POST returns the real id (PATCH needs a uuid).
    // Queue the PATCH behind the pending add if a sub-second undo turns out to matter.
    if (drink.id.startsWith("temp")) return;
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
      if (!data) {
        tapFailed();
        totalRef.current += 1;
        rollback(drink, prevCount);
      }
    });
  }

  return { drinks, setDrinks, totalRef, addDrink, increment, decrement };
}
