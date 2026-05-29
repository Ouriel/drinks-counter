"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Card, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { CATEGORY_EMOJI } from "@/lib/constants";
import type { Drink, MenuItem } from "@/lib/types";

export function DrinkPicker({
  menuItems,
  currentDrinks,
  onSelect,
  onClose,
  onSnapMenu,
}: {
  menuItems: MenuItem[];
  currentDrinks: Drink[];
  onSelect: (name: string, category?: string) => void;
  onClose: () => void;
  onSnapMenu?: () => void;
}) {
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const t = useTranslations("picker");

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const currentNames = new Set(currentDrinks.map((drink) => drink.name));
  const filtered = menuItems.filter(
    (item) => item.name.toLowerCase().includes(search.toLowerCase()) && !currentNames.has(item.name)
  );
  const grouped = filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
  const showAddCustom =
    search.trim().length > 0 &&
    !menuItems.some((item) => item.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex flex-col"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
    >
      <div
        ref={containerRef}
        className="bg-background rounded-t-2xl mt-12 flex-1 overflow-y-auto overscroll-contain p-4"
      >
        <div className="w-10 h-1 bg-default-300/40 rounded-full mx-auto mb-3" />
        <div className="flex justify-between items-center mb-4">
          <h2 id="picker-title" className="text-xl font-bold">
            {t("title")}
          </h2>
          <Button variant="ghost" size="sm" onPress={onClose} aria-label={t("close")}>
            ×
          </Button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (search.trim()) onSelect(search.trim());
          }}
          className="mb-4"
        >
          <Input
            className="w-full"
            placeholder={t("search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
        </form>

        {showAddCustom && (
          <Button
            variant="ghost"
            className="w-full mb-4 border border-accent/50 text-accent"
            onPress={() => onSelect(search.trim())}
          >
            {t("addCustom", { name: search.trim() })}
          </Button>
        )}

        {currentDrinks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm text-default-500 uppercase mb-2">{t("alreadyOrdered")}</h3>
            <div className="space-y-1">
              {currentDrinks.map((drink) => (
                <Card key={drink.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(drink.name, drink.category || undefined)}
                    className="w-full text-left p-3 cursor-pointer flex justify-between"
                  >
                    <span>
                      {CATEGORY_EMOJI[drink.category || "other"] || "🍹"} {drink.name}
                    </span>
                    <span className="text-default-500">×{drink.count}</span>
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Chip size="sm">{CATEGORY_EMOJI[category] || "🍹"}</Chip>
              <span className="text-sm text-default-500 uppercase">{category}</span>
            </div>
            <div className="space-y-1">
              {items.map((item) => (
                <Card key={item.name}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.name, item.category)}
                    className="w-full text-left p-3 cursor-pointer"
                  >
                    {item.name}
                  </button>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {!filtered.length && !showAddCustom && !search && currentDrinks.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-default-500">{t("emptyTitle")}</p>
            <p className="text-default-500 text-sm mt-1">{t("emptyHint")}</p>
          </div>
        )}

        {onSnapMenu && filtered.length === 0 && (
          <div className="text-center mt-6 pt-4 border-t border-default-200">
            <p className="text-sm text-default-500 mb-3">{t("snapHint")}</p>
            <Button variant="ghost" onPress={onSnapMenu}>
              📸 {t("snapMenu")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
