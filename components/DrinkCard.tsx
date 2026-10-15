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
    <Card className="p-0">
      <div
        className="w-full pl-3 pr-2 py-2.5 flex items-center gap-2 select-none"
        aria-label={t("aria", { name: drink.name, count: drink.count })}
      >
        <Chip size="sm" className="shrink-0">
          <CategoryIcon category={drink.category} className="w-4 h-4" />
        </Chip>
        <span className="flex-1 min-w-0 text-base font-medium break-words line-clamp-2">
          {drink.name}
          {isTop && <span className="ml-1">👑</span>}
        </span>
        {/* − is secondary (outlined), + is the main action (filled amber, the biggest target). */}
        <button
          type="button"
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full border border-default-300 text-xl font-semibold text-default-600 hover:bg-foreground/10 active:scale-95 transition"
          onClick={onLongPress}
          aria-label={t("remove")}
        >
          −
        </button>
        <span className="text-2xl font-bold tabular-nums text-center min-w-[2ch]">
          {drink.count}
        </span>
        <button
          type="button"
          className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-accent text-black text-2xl font-bold shadow-sm active:scale-95 transition cursor-pointer"
          {...longPressProps}
          onClick={handleClick}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={t("add")}
        >
          +
        </button>
      </div>
    </Card>
  );
}
