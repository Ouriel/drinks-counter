"use client";

import { useRef } from "react";
import { Card, Chip } from "@heroui/react";
import { useLongPress } from "react-aria";
import { useTranslations } from "next-intl";
import { CategoryIcon } from "@/lib/category-icon";
import type { Drink } from "@/lib/types";

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
          <Chip size="sm">
            <CategoryIcon category={drink.category} className="w-4 h-4" />
          </Chip>
          <span className="text-base font-medium break-words line-clamp-2">{drink.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isTop && <span className="text-lg">👑</span>}
          <button
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-full text-2xl font-bold text-primary hover:bg-foreground/10 transition-colors"
            onClick={onLongPress}
            aria-label={t("remove")}
          >
            −
          </button>
          <span className="text-3xl font-bold tabular-nums text-center min-w-[2ch]">
            {drink.count}
          </span>
          <button
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-full text-2xl font-bold text-primary hover:bg-foreground/10 active:scale-95 transition-transform cursor-pointer"
            {...longPressProps}
            onClick={handleClick}
            onContextMenu={(event) => event.preventDefault()}
            aria-label={t("add")}
          >
            +
          </button>
        </div>
      </div>
    </Card>
  );
}
