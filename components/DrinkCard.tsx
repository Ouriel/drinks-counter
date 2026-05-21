"use client";

import { useRef } from "react";
import { Card, Chip } from "@heroui/react";
import { useLongPress } from "react-aria";
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
  const longPressed = useRef(false);

  const { longPressProps } = useLongPress({
    accessibilityDescription: "Long press to remove",
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
      <button
        type="button"
        className="w-full p-4 flex items-center justify-between select-none cursor-pointer active:scale-[0.98] transition-transform"
        {...longPressProps}
        onClick={handleClick}
        onContextMenu={(event) => event.preventDefault()}
        aria-label={`${drink.name}, ${drink.count}. Tap to add, long press to remove`}
      >
        <div className="flex items-center gap-2">
          <Chip size="sm">{categoryEmoji(drink.category)}</Chip>
          <span className="text-lg font-medium">{drink.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tabular-nums">{drink.count}</span>
          {isTop && <span className="text-lg">👑</span>}
          <span className="text-muted text-lg">+</span>
        </div>
      </button>
    </Card>
  );
}
