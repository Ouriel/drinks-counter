"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Chip, Spinner } from "@heroui/react";

type Drink = { name: string; count: number; category: string | null; createdAt: string };

const CATEGORY_EMOJI: Record<string, string> = {
  beer: "🍺",
  wine: "🍷",
  cocktail: "🍸",
  spirit: "🥃",
  soft: "🥤",
  food: "🍕",
  other: "🍹",
};

export default function SummaryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [barName, setBarName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [dRes, sRes] = await Promise.all([
        fetch(`/api/drinks?slug=${slug}`),
        fetch(`/api/sessions?slug=${slug}`),
      ]);
      if (dRes.ok) setDrinks((await dRes.json()).drinks);
      if (sRes.ok) {
        const s = await sRes.json();
        if (s.session?.barName) setBarName(s.session.barName);
      }
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

  const total = drinks.reduce((sum, d) => sum + d.count, 0);
  const byCategory = drinks.reduce<Record<string, number>>((acc, d) => {
    const cat = d.category || "other";
    acc[cat] = (acc[cat] || 0) + d.count;
    return acc;
  }, {});

  const firstDrink = drinks.reduce<string | null>(
    (e, d) => (!e || d.createdAt < e ? d.createdAt : e),
    null
  );
  const lastDrink = drinks.reduce<string | null>(
    (l, d) => (!l || d.createdAt > l ? d.createdAt : l),
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-5xl mb-2">🍻</p>
            <h1 className="text-2xl font-bold">Evening Summary</h1>
            {barName && <p className="text-foreground/70 mt-1">{barName}</p>}
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

          {/* Top drinks */}
          <div className="space-y-1">
            {drinks
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((d) => (
                <div key={d.name} className="flex justify-between text-sm px-2 py-1">
                  <span>
                    {CATEGORY_EMOJI[d.category || "other"] || "🍹"} {d.name}
                  </span>
                  <span className="font-bold">×{d.count}</span>
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
                text: `${total} drinks at ${barName || "the bar"} 🍻`,
                url: window.location.href,
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          Share 📤
        </Button>
        <Button variant="ghost" onPress={() => window.history.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}
