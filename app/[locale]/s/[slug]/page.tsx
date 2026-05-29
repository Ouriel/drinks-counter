"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button, Popover, Spinner, toast } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "@/i18n/navigation";
import { ThemeSwitch } from "@/lib/theme-switch";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { titleCase } from "@/lib/sanitize";
import { DrinkCard } from "@/components/DrinkCard";
import { DrinkPicker } from "@/components/DrinkPicker";
import { Confetti } from "@/components/Confetti";
import { TableView } from "@/components/TableView";
import { getSessionHue, getPace, getTipsyStyle } from "@/lib/gamification";
import { useOptimisticDrinks } from "@/lib/useOptimisticDrinks";
import { api } from "@/lib/api";
import type { Drink, MenuItem } from "@/lib/types";

function formatElapsed(drinks: Drink[]): string | null {
  const firstDrink = drinks.reduce<string | null>((earliest, d) => {
    if (!d.createdAt) return earliest;
    return !earliest || d.createdAt < earliest ? d.createdAt : earliest;
  }, null);
  if (!firstDrink) return null;
  const mins = Math.floor((Date.now() - new Date(firstDrink).getTime()) / 60000);
  if (mins < 1) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ""}` : `${m}m`;
}

function ElapsedTimer({ drinks }: { drinks: Drink[] }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const elapsed = formatElapsed(drinks);
  if (!elapsed) return null;
  return <> · ⏱ {elapsed}</>;
}

export default function SessionPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const t = useTranslations();
  const [showConfetti, setShowConfetti] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [barName, setBarName] = useState("");
  const [tableCode, setTableCode] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const snapRef = useRef<HTMLInputElement>(null);

  const { drinks, setDrinks, totalRef, addDrink, increment, decrement } = useOptimisticDrinks(
    slug,
    () => setShowConfetti(true)
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [drinksData, sessionData] = await Promise.all([
        api.getDrinks(slug),
        api.getSession(slug),
      ]);
      if (cancelled) return;
      if (!drinksData) {
        router.replace(`/?slug=${slug}`);
        return;
      }
      setDrinks(drinksData.drinks);
      totalRef.current = drinksData.drinks.reduce((sum, item) => sum + item.count, 0);
      setLoading(false);
      if (sessionData) {
        if (sessionData.menuItems.length) setMenuItems(sessionData.menuItems);
        if (sessionData.session.barName) setBarName(sessionData.session.barName);
        if (sessionData.session.tableCode) setTableCode(sessionData.session.tableCode);
        if (sessionData.session.nickname) setNickname(sessionData.session.nickname);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, router, setDrinks, totalRef]);

  function handleAddDrink(name: string, category?: string) {
    setShowPicker(false);
    addDrink(name, category);
  }

  async function handleSnapMenu(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setShowPicker(false);
    const { default: imageCompression } = await import("browser-image-compression");
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    });
    const formData = new FormData();
    formData.append("photo", compressed);
    const data = await api.parseMenu(formData);
    if (data.items.length > 0) {
      const existing = new Set(menuItems.map((item) => item.name.toLowerCase()));
      const newItems = data.items.filter((item) => !existing.has(item.name.toLowerCase()));
      if (newItems.length > 0) setMenuItems((prev) => [...prev, ...newItems]);
      toast(`📸 ${data.items.length} drinks imported`);
    }
  }

  const total = drinks.reduce((sum, d) => sum + d.count, 0);
  const pace = getPace(drinks);
  const { resolvedTheme } = useTheme();
  const bgColor = getSessionHue(total, resolvedTheme === "dark");
  const tipsyStyle = getTipsyStyle(total);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] transition-all duration-1000 text-foreground ${total >= 15 ? "tipsy-vignette" : ""}`}
      style={{ backgroundColor: bgColor, ...tipsyStyle }}
    >
      {/* Header */}
      <div className="mb-6 relative">
        {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push("/")}
              aria-label={t("session.new")}
            >
              🏠
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                if (navigator.share) {
                  navigator.share({
                    title: t("app.title"),
                    text: t("session.joinSession", { bar: titleCase(barName || slug) }),
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast(t("session.linkCopied"));
                }
              }}
              aria-label={t("session.share")}
            >
              📤
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Image src="/icon.svg" alt="" width={32} height={32} />
            <span className="font-bold text-sm">TipsyTap</span>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeSwitch />
          </div>
        </div>
        <h1
          className={`text-3xl font-bold text-center ${total >= 10 ? "animate-wobble" : ""}`}
          key={total}
        >
          {t("session.drinks", { count: total })}
        </h1>
        {barName && (
          <p className="text-base mt-1 text-center text-foreground/70">
            {titleCase(barName)}
            {" · "}
            <Popover>
              <Popover.Trigger>
                <button
                  type="button"
                  className="font-mono text-sm text-default-400 underline decoration-dotted"
                >
                  {slug}
                </button>
              </Popover.Trigger>
              <Popover.Content>
                <Popover.Dialog>
                  <div className="px-3 py-2 max-w-[200px]">
                    <p className="text-xs text-default-500">{t("session.slugExplain")}</p>
                  </div>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
            <ElapsedTimer drinks={drinks} />
          </p>
        )}
        {!barName && (
          <p className="text-base mt-1 text-center text-foreground/70">
            <Popover>
              <Popover.Trigger>
                <button
                  type="button"
                  className="font-mono text-sm text-default-400 underline decoration-dotted"
                >
                  {slug}
                </button>
              </Popover.Trigger>
              <Popover.Content>
                <Popover.Dialog>
                  <div className="px-3 py-2 max-w-[200px]">
                    <p className="text-xs text-default-500">{t("session.slugExplain")}</p>
                  </div>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
            <ElapsedTimer drinks={drinks} />
          </p>
        )}
        {pace && (
          <p className="text-sm mt-0.5 text-center text-default-500">
            {pace.emoji}{" "}
            {t(`pace.${pace.label.toLowerCase().replace(/ ./g, (c) => c[1].toUpperCase())}`)}
          </p>
        )}
      </div>

      {/* Summary link */}
      {drinks.length > 0 && (
        <div className="text-center mb-4">
          <Button variant="ghost" size="sm" onPress={() => router.push(`/s/${slug}/summary`)}>
            {t("session.eveningSummary")}
          </Button>
        </div>
      )}

      {/* Drinks list */}
      {drinks.length === 0 ? (
        <div className="text-center text-default-500 mt-12">
          <p className="text-lg">{t("session.noDrinks")}</p>
          <p className="text-sm mt-2">{t("session.noDrinksHint")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {(() => {
              const maxCount =
                drinks.length > 1 ? Math.max(...drinks.map((item) => item.count)) : 0;
              return drinks.map((drink) => (
                <DrinkCard
                  key={drink.id.startsWith("temp") ? drink.name : drink.id}
                  drink={drink}
                  onTap={() => increment(drink)}
                  onLongPress={() => decrement(drink)}
                  isTop={drinks.length > 1 && drink.count === maxCount}
                />
              ));
            })()}
          </div>
          {total <= 3 && (
            <p className="text-center text-default-500 text-xs mt-4">
              {t("session.longPressHint")}
            </p>
          )}
        </>
      )}

      {/* Table */}
      <TableView slug={slug} tableCode={tableCode} nickname={nickname} drinkTotal={total} />

      {/* FAB */}
      <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center">
        <Button variant="primary" size="lg" onPress={() => setShowPicker(true)}>
          {t("session.addDrink")}
        </Button>
      </div>

      {/* Picker */}
      {showPicker && (
        <DrinkPicker
          menuItems={menuItems}
          currentDrinks={drinks}
          onSelect={handleAddDrink}
          onClose={() => setShowPicker(false)}
          onSnapMenu={() => snapRef.current?.click()}
        />
      )}
      <input
        ref={snapRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSnapMenu}
        className="hidden"
      />
    </div>
  );
}
