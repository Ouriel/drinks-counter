"use client";

import { useRef } from "react";
import { Card, Chip } from "@heroui/react";
import { useLongPress } from "react-aria";
import { useTranslations } from "next-intl";
import { CATEGORY_EMOJI } from "@/lib/constants";
import type { Drink } from "@/lib/types";

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
  const longPressed = useRef(false);
  const t = useTranslations("drinkCard");

  const { longPressProps } = useLongPress({
    accessibilityDescription: t("longPress"),
    threshold: 500,
    onLongPress: () => {
      longPressed.current = true;
      onLongPress();
    },
  });

  const handleClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onTap();
  };

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-full text-default-400 hover:text-danger hover:bg-danger/10 text-sm transition-colors"
            onClick={onLongPress}
            aria-label={t("remove")}
          >
            −
          </button>
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1 rounded-full active:scale-95 transition-transform cursor-pointer"
            {...longPressProps}
            onClick={handleClick}
            onContextMenu={(event) => event.preventDefault()}
          >
            <span className="text-3xl font-bold tabular-nums">{drink.count}</span>
            <span className="text-xl font-bold text-primary">+</span>
          </button>
          {isTop && <span className="text-lg">👑</span>}
        </div>
      </div>
    </Card>
  );
}
