"use client";

import { useRef } from "react";
import { Card, Chip } from "@heroui/react";
import { CATEGORY_EMOJI } from "@/lib/constants";

export type Drink = {
  id: string;
  name: string;
  count: number;
  category: string | null;
  createdAt?: string;
};

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
  const timerRef = useRef<NodeJS.Timeout>(null);
  const longPressed = useRef(false);
  const isTouchDevice = useRef(false);

  const handleTouchStart = () => {
    isTouchDevice.current = true;
    longPressed.current = false;
    timerRef.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 500);
  };
  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!longPressed.current) onTap();
  };
  const handleMouseDown = () => {
    if (isTouchDevice.current) return;
    longPressed.current = false;
    timerRef.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 500);
  };
  const handleMouseUp = () => {
    if (isTouchDevice.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!longPressed.current) onTap();
  };

  return (
    <Card>
      <button
        type="button"
        className="w-full p-4 flex items-center justify-between select-none cursor-pointer active:scale-[0.98] transition-transform"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
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
