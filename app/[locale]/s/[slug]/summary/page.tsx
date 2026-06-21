"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button, Card, Chip, Spinner, Popover, toast } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Share2, Info, Medal, Clock, Wine, CupSoda } from "lucide-react";
import { CATEGORY_EMOJI, isAlcoholic } from "@/lib/constants";
import { CategoryIcon } from "@/lib/category-icon";
import { titleCase } from "@/lib/sanitize";
import {
  getAllEarnedBadges,
  getDrinkAchievements,
  getPace,
  getPersonalBest,
} from "@/lib/gamification";
import { api } from "@/lib/api";
import type { Drink } from "@/lib/types";

export default function SummaryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const t = useTranslations();
  const tCat = useTranslations("categories");
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [barName, setBarName] = useState("");
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    async function load() {
      const [drinksData, sessionData] = await Promise.all([
        api.getDrinks(slug),
        api.getSession(slug),
      ]);
      if (!drinksData) {
        setExpired(true);
        setLoading(false);
        return;
      }
      setDrinks(drinksData.drinks);
      if (sessionData?.session.barName) setBarName(sessionData.session.barName);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <div className="p-6 text-center">
            <p className="text-5xl mb-4">⏰</p>
            <h1 className="text-xl font-bold mb-2">{t("summary.expired")}</h1>
            <p className="text-default-500">{t("summary.expiredMessage")}</p>
            <Button variant="primary" className="mt-6" onPress={() => router.push("/")}>
              {t("summary.newEvening")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const total = drinks.reduce((sum, d) => sum + d.count, 0);
  const alcoholicTotal = drinks.reduce(
    (sum, drink) => sum + (isAlcoholic(drink.category) ? drink.count : 0),
    0
  );
  const nonAlcoholicTotal = total - alcoholicTotal;
  const byCategory = drinks.reduce<Record<string, number>>((acc, d) => {
    const cat = d.category || "other";
    acc[cat] = (acc[cat] || 0) + d.count;
    return acc;
  }, {});

  const firstDrink = drinks.reduce<string | null>(
    (earliest, drink) =>
      !drink.createdAt
        ? earliest
        : !earliest || drink.createdAt < earliest
          ? drink.createdAt
          : earliest,
    null
  );
  const lastDrink = drinks.reduce<string | null>(
    (latest, drink) =>
      !drink.createdAt ? latest : !latest || drink.createdAt > latest ? drink.createdAt : latest,
    null
  );
  // Duration: from first tap to last tap (falls back to drink record timestamps for legacy data)
  const tapTimes = drinks.flatMap((drink) => drink.tappedAt || []).sort();
  const firstTime = tapTimes[0] ?? firstDrink;
  const lastTime = tapTimes[tapTimes.length - 1] ?? lastDrink;
  const durationMins =
    firstTime && lastTime
      ? Math.floor((new Date(lastTime).getTime() - new Date(firstTime).getTime()) / 60000)
      : 0;
  const durationStr =
    durationMins >= 60
      ? `${Math.floor(durationMins / 60)}h${durationMins % 60 > 0 ? `${durationMins % 60}m` : ""}`
      : `${durationMins}m`;

  // Build timeline from all individual taps
  const timeline = drinks
    .flatMap((drink) =>
      (drink.tappedAt || []).map((time) => ({ name: drink.name, category: drink.category, time }))
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  function buildSummaryText(): string {
    const sorted = [...drinks].sort((a, b) => b.count - a.count);
    const lines = sorted.map(
      (drink) =>
        `${CATEGORY_EMOJI[drink.category || "other"] || "🍹"} ${drink.name} ×${drink.count}`
    );
    const topDrink = sorted[0];

    // Fun opener based on total
    let opener = `🍻 ${total} drinks`;
    if (total >= 15) opener = `☠️ ${total} drinks (no regrets)`;
    else if (total >= 10) opener = `👑 ${total} drinks (legend mode)`;
    else if (total >= 5) opener = `🔥 ${total} drinks (on fire)`;

    return [
      opener + (barName ? ` at ${titleCase(barName)}` : ""),
      durationMins > 0 ? `⏱ ${durationStr} of pure dedication` : "",
      topDrink ? `⭐ MVP: ${topDrink.name} (×${topDrink.count})` : "",
      "",
      ...lines,
      "",
      total >= 10 ? "💀 RIP tomorrow" : total >= 5 ? "🫡 Cheers!" : "🍺 Just getting started",
      "— tipsy-tap.vercel.app",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function shareSummary() {
    // Privacy: share the text recap (which includes the public site URL) only —
    // never the private session slug. On desktop without the Web Share API, fall
    // back to copying the text to the clipboard.
    const text = buildSummaryText();
    if (navigator.share) {
      navigator.share({ title: t("app.title"), text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast(t("summary.copied"), { timeout: 15000 });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <Card className="w-full max-w-sm">
        <div className="p-6">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push(`/s/${slug}`)}
            className="mb-4"
          >
            ← {t("summary.back")}
          </Button>

          {/* Header */}
          <div className="text-center mb-6">
            <Image src="/icon.svg" alt="" width={48} height={48} className="mx-auto mb-2" />
            <h1 className="text-2xl font-bold">{t("summary.title")}</h1>
            {barName && <p className="text-foreground/70 mt-1">{titleCase(barName)}</p>}
            {firstDrink && (
              <p className="text-sm text-default-500 mt-1">
                {new Date(firstDrink).toLocaleDateString()} · {durationStr}
              </p>
            )}
          </div>

          {/* Total */}
          <div className="text-center mb-6">
            <p className="text-6xl font-bold">{total}</p>
            <p className="text-default-500">{t("summary.drinksTotal", { count: total })}</p>
            {total === getPersonalBest() && total > 0 && (
              <p className="text-sm mt-1 flex items-center justify-center gap-1">
                <Medal className="w-4 h-4" />
                {t("summary.personalBest")}
              </p>
            )}
            {nonAlcoholicTotal > 0 && alcoholicTotal > 0 && (
              <p className="text-sm text-default-500 mt-2 flex items-center justify-center gap-1 flex-wrap">
                <Wine className="w-4 h-4" />
                {t("summary.withAlcohol", { count: alcoholicTotal })}
                <span className="mx-1">·</span>
                <CupSoda className="w-4 h-4" />
                {t("summary.alcoholFree", { count: nonAlcoholicTotal })}
              </p>
            )}
          </div>

          {/* Pace */}
          {(() => {
            const pace = getPace(drinks);
            if (!pace) return null;
            return (
              <p className="text-center text-sm text-default-500 mb-4">
                {t("summary.pace", {
                  emoji: pace.emoji,
                  label: t(
                    `pace.${pace.label.toLowerCase().replace(/ ./g, (c) => c[1].toUpperCase())}`
                  ),
                })}
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
                      <div className="px-3 py-2 max-w-[220px]">
                        <p className="text-xs text-default-500">
                          {t("pace.explain", { dph: pace.dph })}
                        </p>
                      </div>
                    </Popover.Dialog>
                  </Popover.Content>
                </Popover>
              </p>
            );
          })()}

          {/* By category */}
          {Object.keys(byCategory).length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <Chip key={cat} size="md">
                    <span className="flex items-center gap-1">
                      <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                      {tCat(cat)} ×{count}
                    </span>
                  </Chip>
                ))}
            </div>
          )}

          {/* Badges with tooltips */}
          {(() => {
            const badges = getAllEarnedBadges(total);
            const achievements = getDrinkAchievements(drinks);
            return (
              <>
                {badges.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-3 mb-4">
                    {badges.map((badge) => (
                      <Popover key={badge.title}>
                        <Popover.Trigger>
                          <button type="button" className="text-3xl">
                            {badge.emoji}
                          </button>
                        </Popover.Trigger>
                        <Popover.Content>
                          <Popover.Dialog>
                            <div className="px-3 py-2 text-center">
                              <p className="font-bold text-sm">{badge.title}</p>
                              <p className="text-xs text-default-500">{badge.subtitle}</p>
                            </div>
                          </Popover.Dialog>
                        </Popover.Content>
                      </Popover>
                    ))}
                  </div>
                )}

                {achievements.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-3 mb-4">
                    {achievements.map((achievement) => (
                      <Popover key={achievement.key}>
                        <Popover.Trigger>
                          <button type="button" className="text-3xl">
                            {achievement.emoji}
                          </button>
                        </Popover.Trigger>
                        <Popover.Content>
                          <Popover.Dialog>
                            <div className="px-3 py-2 text-center">
                              <p className="font-bold text-sm">
                                {t(`achievements.${achievement.key}`, achievement.params)}
                              </p>
                            </div>
                          </Popover.Dialog>
                        </Popover.Content>
                      </Popover>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="mb-6">
              {!showTimeline ? (
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onPress={() => setShowTimeline(true)}
                  >
                    <Clock className="w-4 h-4" />
                    {t("summary.timeline")}
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-center mb-3 flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    {t("summary.timeline")}
                  </h3>
                  <div className="space-y-3">
                    {timeline.map((entry, index) => {
                      const time = new Date(entry.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full border-2 border-primary bg-background shrink-0" />
                          <div className="flex-1 bg-default-100 rounded-xl px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryIcon category={entry.category} className="w-4 h-4" />
                              <span className="text-sm font-medium">{entry.name}</span>
                            </div>
                            <span className="text-xs text-default-400 font-mono tabular-nums">
                              {time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Top drinks */}
          <div className="space-y-1">
            {[...drinks]
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((drink) => (
                <div key={drink.name} className="flex justify-between text-sm px-2 py-1">
                  <span className="flex items-center gap-2">
                    <CategoryIcon category={drink.category} className="w-4 h-4 shrink-0" />
                    {drink.name}
                  </span>
                  <span className="font-bold">×{drink.count}</span>
                </div>
              ))}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3 mt-6">
            <Button variant="primary" className="gap-1" onPress={shareSummary}>
              <Share2 className="w-4 h-4" />
              {t("summary.share")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
