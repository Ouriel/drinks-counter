"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button, Popover, Spinner, toast } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Home, Share2, ChartColumn, Users, Info } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { ThemeSwitch } from "@/lib/theme-switch";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { titleCase } from "@/lib/sanitize";
import { DrinkCard } from "@/components/DrinkCard";
import { Logo } from "@/components/Logo";
import { TableView } from "@/components/TableView";
import { getSessionHue, getPace, getTipsyStyle, getIconColor } from "@/lib/gamification";
import { useOptimisticDrinks } from "@/lib/useOptimisticDrinks";
import { useIsHydrated } from "@/lib/use-is-hydrated";
import { api } from "@/lib/api";
import type { Drink, MenuItem } from "@/lib/types";

// Interaction-only components — not needed for first paint, so they're code-split out of the
// initial hydration bundle and loaded on demand (picker opened / milestone hit).
const DrinkPicker = dynamic(() =>
  import("@/components/DrinkPicker").then((mod) => mod.DrinkPicker)
);
const Confetti = dynamic(() => import("@/components/Confetti").then((mod) => mod.Confetti));

function formatElapsed(drinks: Drink[]): string | null {
  const firstDrink = drinks.reduce<string | null>((earliest, drink) => {
    if (!drink.createdAt) return earliest;
    return !earliest || drink.createdAt < earliest ? drink.createdAt : earliest;
  }, null);
  if (!firstDrink) return null;
  const mins = Math.floor((Date.now() - new Date(firstDrink).getTime()) / 60000);
  if (mins < 1) return null;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return hours > 0 ? `${hours}h${minutes > 0 ? `${minutes}m` : ""}` : `${minutes}m`;
}

// True only after client hydration (false on the server and the first client render),
// without a setState-in-effect. Used to gate time-relative UI so the server and client
// render identically at hydration time (avoids React #418 mismatch).
function ElapsedTimer({ drinks }: { drinks: Drink[] }) {
  const hydrated = useIsHydrated();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!hydrated) return null;
  const elapsed = formatElapsed(drinks);
  if (!elapsed) return null;
  return <> · ⏱ {elapsed}</>;
}

export function SessionClient({
  slug,
  notFound,
  initialDrinks,
  initialMenuItems,
  initialBarName,
  initialTableCode,
  initialNickname,
}: {
  slug: string;
  notFound: boolean;
  initialDrinks: Drink[];
  initialMenuItems: MenuItem[];
  initialBarName: string;
  initialTableCode: string | null;
  initialNickname: string | null;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [showConfetti, setShowConfetti] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [barName] = useState(initialBarName);
  const [tableCode, setTableCode] = useState<string | null>(initialTableCode);
  const nickname = initialNickname;
  const [showPicker, setShowPicker] = useState(false);
  const mounted = useIsHydrated();
  const snapRef = useRef<HTMLInputElement>(null);

  const { drinks, addDrink, increment, decrement } = useOptimisticDrinks(
    slug,
    t,
    () => setShowConfetti(true),
    initialDrinks
  );

  // Expired/unknown session → recover from the home screen (which can recreate it).
  useEffect(() => {
    if (notFound) router.replace(`/?slug=${slug}`);
  }, [notFound, router, slug]);

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
      toast(`📸 ${t("toast.drinksImported", { count: data.items.length })}`, { timeout: 15000 });
    }
  }

  const total = drinks.reduce((sum, drink) => sum + drink.count, 0);
  const pace = getPace(drinks);
  const { resolvedTheme } = useTheme();
  // Until hydrated, assume the dark default theme (matches `defaultTheme="dark"` and the
  // server-rendered <html class="dark">). Reading resolvedTheme during SSR/first render
  // would yield light colors and mismatch the client → React #418.
  const isDark = mounted ? resolvedTheme === "dark" : true;
  const bgColor = getSessionHue(total, isDark);
  const tipsyStyle = getTipsyStyle(total);
  const iconColor = getIconColor(total, isDark);

  if (notFound) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] transition-all duration-1000 text-foreground ${total >= 15 ? "tipsy-vignette" : ""}`}
      style={
        {
          backgroundColor: bgColor,
          ...tipsyStyle,
          "--tipsy-icon": iconColor,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className="mb-6 relative">
        {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onPress={() => router.push("/")}
              aria-label={t("session.new")}
            >
              <Home className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onPress={() => {
                if (navigator.share) {
                  navigator.share({
                    title: t("app.title"),
                    text: t("session.joinSession", { bar: titleCase(barName || slug) }),
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast(t("session.linkCopied"), { timeout: 15000 });
                }
              }}
              aria-label={t("session.share")}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Logo size={32} />
            <span className="font-bold text-sm">TipsyTap</span>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeSwitch />
          </div>
        </div>
        {/* The bar name + slug + elapsed line is the session title. The big drink total was
            removed — counts live on each drink card, the summary and the table ranking. */}
        {barName && (
          <div
            role="heading"
            aria-level={1}
            className="text-base mt-1 text-center text-foreground/70"
          >
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
          </div>
        )}
        {!barName && (
          <div
            role="heading"
            aria-level={1}
            className="text-base mt-1 text-center text-foreground/70"
          >
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
          </div>
        )}
        <div className="text-sm mt-0.5 text-center text-default-500 min-h-[1.25rem]">
          {mounted && pace && (
            <>
              {pace.emoji}{" "}
              {t(
                `pace.${pace.label.toLowerCase().replace(/ ./g, (match) => match[1].toUpperCase())}`
              )}
              <Popover>
                <Popover.Trigger>
                  <button
                    type="button"
                    className="ml-1 text-default-400"
                    aria-label={t("pace.info")}
                  >
                    <Info className="inline w-3.5 h-3.5" />
                  </button>
                </Popover.Trigger>
                <Popover.Content>
                  <Popover.Dialog>
                    <div className="px-3 py-2 w-max max-w-[260px]">
                      <p className="text-xs text-default-500">
                        {t("pace.explain", { dph: pace.dph })}
                      </p>
                    </div>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>
            </>
          )}
        </div>
      </div>

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
        </>
      )}

      {/* Summary link */}
      {drinks.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onPress={() => router.push(`/s/${slug}/summary`)}
          >
            <ChartColumn className="w-4 h-4" />
            {t("session.eveningSummary")}
          </Button>
          {tableCode && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onPress={() => router.push(`/s/${slug}/table-summary`)}
            >
              <Users className="w-4 h-4" />
              {t("session.tableSummary")}
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <TableView
        slug={slug}
        tableCode={tableCode}
        nickname={nickname}
        drinkTotal={total}
        onTableChange={setTableCode}
      />

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
