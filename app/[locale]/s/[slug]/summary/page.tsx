"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Chip, Spinner, Popover } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CATEGORY_EMOJI } from "@/lib/constants";
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
  const [copied, setCopied] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const copiedTimeout = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
    };
  }, []);

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
  // Duration: from first drink to last drink
  const durationMins =
    firstDrink && lastDrink
      ? Math.floor((new Date(lastDrink).getTime() - new Date(firstDrink).getTime()) / 60000)
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

  function copyAsText() {
    const lines = [...drinks]
      .sort((a, b) => b.count - a.count)
      .map(
        (drink) =>
          `${CATEGORY_EMOJI[drink.category || "other"] || "🍹"} ${drink.name} ×${drink.count}`
      );
    const categories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${CATEGORY_EMOJI[cat] || "🍹"} ${cat} ×${count}`)
      .join(", ");
    const text = [
      `🍻 ${total} drinks${barName ? ` at ${titleCase(barName)}` : ""}`,
      durationMins > 0 ? `⏱ ${durationStr}` : "",
      categories ? `📊 ${categories}` : "",
      "",
      ...lines,
      "",
      "— tipsy-tap.vercel.app",
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    copiedTimeout.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <Card className="w-full max-w-sm">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-5xl mb-2">🍻</p>
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
              <p className="text-sm mt-1">{t("summary.personalBest")}</p>
            )}
          </div>

          {/* By category */}
          {Object.keys(byCategory).length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <Chip key={cat} size="md">
                    {CATEGORY_EMOJI[cat] || "🍹"} {tCat(cat)} ×{count}
                  </Chip>
                ))}
            </div>
          )}

          {/* Badges with tooltips */}
          {(() => {
            const badges = getAllEarnedBadges(total);
            const pace = getPace(drinks);
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

                {pace && (
                  <p className="text-center text-sm text-default-500 mb-4">
                    {t("summary.pace", {
                      emoji: pace.emoji,
                      label: t(
                        `pace.${pace.label.toLowerCase().replace(/ ./g, (c) => c[1].toUpperCase())}`
                      ),
                    })}
                  </p>
                )}

                {achievements.length > 0 && (
                  <div className="space-y-1 mb-4">
                    {achievements.map((achievement) => (
                      <p key={achievement.key} className="text-sm text-center">
                        {achievement.emoji}{" "}
                        {t(`achievements.${achievement.key}`, achievement.params)}
                      </p>
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
                  <Button variant="ghost" size="sm" onPress={() => setShowTimeline(true)}>
                    {t("summary.timeline")}
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-center mb-3">{t("summary.timeline")}</h3>
                  <div className="relative">
                    {/* Center line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-default-200" />
                    <div className="space-y-4">
                      {timeline.map((entry, index) => {
                        const time = new Date(entry.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return (
                          <div key={index} className="relative flex items-center gap-3 pl-10">
                            {/* Dot */}
                            <div
                              className="absolute left-[14px] w-4 h-4 rounded-full border-2 border-primary bg-background"
                              style={{ opacity: 1 - index * 0.08 }}
                            />
                            {/* Card */}
                            <div className="flex-1 bg-default-100 rounded-lg px-3 py-2 flex items-center justify-between">
                              <span className="text-sm">
                                <span className="mr-1">
                                  {CATEGORY_EMOJI[entry.category || "other"] || "🍹"}
                                </span>
                                {entry.name}
                              </span>
                              <span className="text-xs text-default-400 font-mono ml-2">
                                {time}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                  <span>
                    {CATEGORY_EMOJI[drink.category || "other"] || "🍹"} {drink.name}
                  </span>
                  <span className="font-bold">×{drink.count}</span>
                </div>
              ))}
          </div>

          <p className="text-center text-xs text-default-500 mt-6">tipsy-tap.vercel.app</p>
        </div>
      </Card>

      {/* Actions */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-3 px-6">
        <Button
          variant="primary"
          onPress={() => {
            if (navigator.share) {
              navigator.share({
                title: t("app.title"),
                text: `${total} drinks at ${titleCase(barName || "the bar")} 🍻`,
                url: window.location.href,
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          {t("summary.share")}
        </Button>
        <Button variant="ghost" onPress={copyAsText}>
          {copied ? t("summary.copied") : t("summary.copyText")}
        </Button>
        <Button variant="ghost" onPress={() => router.push(`/s/${slug}`)}>
          {t("summary.back")}
        </Button>
      </div>
    </div>
  );
}
