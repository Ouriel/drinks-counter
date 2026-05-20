"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Card, Chip } from "@heroui/react";
import { CATEGORY_EMOJI } from "@/lib/constants";
import type { Drink } from "./DrinkCard";

type MenuItem = { name: string; category: string };

export function DrinkPicker({
  menuItems,
  currentDrinks,
  onSelect,
  onClose,
}: {
  menuItems: MenuItem[];
  currentDrinks: Drink[];
  onSelect: (name: string, category?: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape + trap focus
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const currentNames = new Set(currentDrinks.map((d) => d.name));
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="bg-surface rounded-t-2xl mt-12 flex-1 overflow-y-auto overscroll-contain p-4"
      >
        <div className="w-10 h-1 bg-muted/40 rounded-full mx-auto mb-3" />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Pick a drink</h2>
          <Button variant="ghost" size="sm" onPress={onClose} aria-label="Close">
            ×
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim()) onSelect(search.trim());
          }}
          className="mb-4"
        >
          <Input
            className="w-full"
            placeholder="Search or type a new drink…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </form>

        {showAddCustom && (
          <Button
            variant="ghost"
            className="w-full mb-4 border border-accent/50 text-accent"
            onPress={() => onSelect(search.trim())}
          >
            + Add &quot;{search.trim()}&quot;
          </Button>
        )}

        {/* Already ordered — at the top for quick +1 */}
        {currentDrinks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm text-muted uppercase mb-2">Already ordered · tap for +1</h3>
            <div className="space-y-1">
              {currentDrinks.map((d) => (
                <Card key={d.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(d.name, d.category || undefined)}
                    className="w-full text-left p-3 cursor-pointer flex justify-between"
                  >
                    <span>
                      {CATEGORY_EMOJI[d.category || "other"] || "🍹"} {d.name}
                    </span>
                    <span className="text-muted">×{d.count}</span>
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Menu items by category */}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Chip size="sm">{CATEGORY_EMOJI[category] || "🍹"}</Chip>
              <span className="text-sm text-muted uppercase">{category}</span>
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
            <p className="text-muted">Type a drink name above</p>
            <p className="text-muted text-sm mt-1">to search or add it</p>
          </div>
        )}
      </div>
    </div>
  );
}
