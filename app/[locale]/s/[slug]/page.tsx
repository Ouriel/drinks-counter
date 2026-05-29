"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button, Spinner, toast } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "@/i18n/navigation";
import { ThemeSwitch } from "@/lib/theme-switch";
import { titleCase } from "@/lib/sanitize";
import { DrinkCard } from "@/components/DrinkCard";
import { DrinkPicker } from "@/components/DrinkPicker";
import { Confetti } from "@/components/Confetti";
import { TableView } from "@/components/TableView";
import { getSessionHue, getPace } from "@/lib/gamification";
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

  const total = drinks.reduce((sum, d) => sum + d.count, 0);
  const pace = getPace(drinks);
  const { resolvedTheme } = useTheme();
  const bgColor = getSessionHue(total, resolvedTheme === "dark");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] transition-colors duration-1000 text-foreground"
      style={{ backgroundColor: bgColor }}
    >
      {/* Header */}
      <div className="text-center mb-6 relative">
        {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
        <div className="absolute left-0 top-0">
          <Button variant="ghost" size="sm" onPress={() => router.push("/")}>
            {t("session.new")}
          </Button>
        </div>
        <div className="absolute right-0 top-0 flex items-center gap-1">
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
          <ThemeSwitch />
        </div>
        <h1 className={`text-3xl font-bold ${total >= 10 ? "animate-wobble" : ""}`} key={total}>
          <Image src="/icon.svg" alt="" width={32} height={32} className="inline mr-2" />
          {t("session.drinks", { count: total })}
        </h1>
        {barName && <p className="text-base mt-1 text-foreground/70">{titleCase(barName)}</p>}
        <p className="text-sm mt-0.5 font-mono text-default-500">
          {slug}
          <ElapsedTimer drinks={drinks} />
          {pace && (
            <>
              {" "}
              · {pace.emoji} {t(`pace.${pace.label.toLowerCase().replace(" ", "")}`)}
            </>
          )}
        </p>
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
          <p className="text-center text-default-500 text-xs mt-4">{t("session.longPressHint")}</p>
        </>
      )}

      {/* Table */}
      <TableView slug={slug} tableCode={tableCode} nickname={nickname} />

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
        />
      )}
    </div>
  );
}
