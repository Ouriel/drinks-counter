"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Chip, Spinner } from "@heroui/react";
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
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [barName, setBarName] = useState("");
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);

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
            <h1 className="text-xl font-bold mb-2">Session expired</h1>
            <p className="text-muted">
              This session has expired (48h limit). Start a new evening to keep counting!
            </p>
            <Button variant="primary" className="mt-6" onPress={() => (window.location.href = "/")}>
              New evening
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
    (e, d) => (!d.createdAt ? e : !e || d.createdAt < e ? d.createdAt : e),
    null
  );
  const lastDrink = drinks.reduce<string | null>(
    (l, d) => (!d.createdAt ? l : !l || d.createdAt > l ? d.createdAt : l),
    null
  );
  const durationMins =
    firstDrink && lastDrink
      ? Math.floor((new Date(lastDrink).getTime() - new Date(firstDrink).getTime()) / 60000)
      : 0;
  const durationStr =
    durationMins >= 60
      ? `${Math.floor(durationMins / 60)}h${durationMins % 60 > 0 ? `${durationMins % 60}m` : ""}`
      : `${durationMins}m`;

  function copyAsText() {
    const lines = [...drinks]
      .sort((a, b) => b.count - a.count)
      .map(
        (drink) =>
          `${CATEGORY_EMOJI[drink.category || "other"] || "🍹"} ${drink.name} ×${drink.count}`
      );
    const text = [
      `🍻 ${total} drinks${barName ? ` at ${titleCase(barName)}` : ""}`,
      durationMins > 0 ? `⏱ ${durationStr}` : "",
      "",
      ...lines,
      "",
      "— tipsy-tap.vercel.app",
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-5xl mb-2">🍻</p>
            <h1 className="text-2xl font-bold">Evening Summary</h1>
            {barName && <p className="text-foreground/70 mt-1">{titleCase(barName)}</p>}
            {firstDrink && (
              <p className="text-sm text-muted mt-1">
                {new Date(firstDrink).toLocaleDateString()} · {durationStr}
              </p>
            )}
          </div>

          {/* Total */}
          <div className="text-center mb-6">
            <p className="text-6xl font-bold">{total}</p>
            <p className="text-muted">drink{total !== 1 ? "s" : ""} total</p>
            {total === getPersonalBest() && total > 0 && (
              <p className="text-sm mt-1">🏅 Personal best!</p>
            )}
          </div>

          {/* By category */}
          {Object.keys(byCategory).length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <Chip key={cat} size="md">
                    {CATEGORY_EMOJI[cat] || "🍹"} {cat} ×{count}
                  </Chip>
                ))}
            </div>
          )}

          {/* Badges */}
          {(() => {
            const badges = getAllEarnedBadges(total);
            const pace = getPace(drinks);
            const achievements = getDrinkAchievements(drinks);
            return (
              <>
                {badges.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {badges.map((badge) => (
                      <span key={badge.title} title={badge.title} className="text-2xl">
                        {badge.emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Pace */}
                {pace && (
                  <p className="text-center text-sm text-muted mb-4">
                    Pace: {pace.emoji} {pace.label}
                  </p>
                )}

                {/* Achievements */}
                {achievements.length > 0 && (
                  <div className="space-y-1 mb-4">
                    {achievements.map((achievement) => (
                      <p key={achievement.text} className="text-sm text-center">
                        {achievement.emoji} {achievement.text}
                      </p>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

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

          <p className="text-center text-xs text-muted mt-6">tipsy-tap.vercel.app</p>
        </div>
      </Card>

      {/* Actions */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-3 px-6">
        <Button
          variant="primary"
          onPress={() => {
            if (navigator.share) {
              navigator.share({
                title: "My TipsyTap Evening",
                text: `${total} drinks at ${titleCase(barName || "the bar")} 🍻`,
                url: window.location.href,
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          Share 📤
        </Button>
        <Button variant="ghost" onPress={copyAsText}>
          {copied ? "Copied ✓" : "Copy text 📋"}
        </Button>
        <Button variant="ghost" onPress={() => (window.location.href = `/s/${slug}`)}>
          Back
        </Button>
      </div>
    </div>
  );
}
