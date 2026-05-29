"use client";

import { Card, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { CATEGORY_EMOJI } from "@/lib/constants";
import type { Drink } from "@/lib/types";

export type { Drink } from "@/lib/types";

function categoryEmoji(cat: string | null): string {
  return CATEGORY_EMOJI[cat || "other"] || "🍹";
}

export function DrinkCard({
  drink,
  onTap,
  onLongPress,
  isTop,
}: {
  drink: Drink;
  onTap: () => void;
  onLongPress: () => void;
  isTop?: boolean;
}) {
  const t = useTranslations("drinkCard");

  return (
    <Card>
      <div
        className="w-full px-4 py-3 flex items-center justify-between select-none"
        aria-label={t("aria", { name: drink.name, count: drink.count })}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Chip size="sm">{categoryEmoji(drink.category)}</Chip>
          <span className="text-lg font-medium truncate">{drink.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full text-lg text-danger/70 hover:bg-danger/10 active:scale-90 transition-transform"
            onClick={onLongPress}
            aria-label={t("remove")}
          >
            −
          </button>
          <span className="text-3xl font-bold tabular-nums w-10 text-center">{drink.count}</span>
          <button
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary active:scale-90 transition-transform"
            onClick={onTap}
            aria-label={t("add")}
          >
            +
          </button>
          {isTop && <span className="text-lg ml-1">👑</span>}
        </div>
      </div>
    </Card>
  );
}
