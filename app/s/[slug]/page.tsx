"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Spinner } from "@heroui/react";
import { ThemeSwitch } from "@/lib/theme-switch";
import { titleCase } from "@/lib/sanitize";
import { DrinkCard } from "@/components/DrinkCard";
import { DrinkPicker } from "@/components/DrinkPicker";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { BadgeToast } from "@/components/BadgeToast";
import { TableView } from "@/components/TableView";
import {
  getBadgeForCount,
  getSessionHue,
  getPace,
  getNudge,
  checkPersonalBest,
  type Badge,
  type Nudge,
} from "@/lib/gamification";
import type { Drink } from "@/components/DrinkCard";

type MenuItem = { name: string; category: string };

function vibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
}

function formatElapsed(drinks: Drink[]): string | null {
  const firstDrink = drinks.reduce<string | null>((earliest, d) => {
    if (!d.createdAt) return earliest;
    return !earliest || d.createdAt < earliest ? d.createdAt : earliest;
  }, null);
  if (!firstDrink) return null;
  const mins = Math.floor((Date.now() - new Date(firstDrink).getTime()) / 60000);
  if (mins < 1) return "just started";
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
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [barName, setBarName] = useState("");
  const [tableCode, setTableCode] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; undoFn: () => void } | null>(null);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const prevTotal = useRef(0);
  const toastTimer = useRef<NodeJS.Timeout>(null);
  const pendingOps = useRef(0);

  const fetchDrinks = useCallback(async () => {
    const res = await fetch(`/api/drinks?slug=${slug}`);
    if (!res.ok) return;
    const data = await res.json();
    // Only reconcile if no pending operations
    if (pendingOps.current === 0) {
      setDrinks(data.drinks);
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [drinksRes, sessionRes] = await Promise.all([
        fetch(`/api/drinks?slug=${slug}`),
        fetch(`/api/sessions?slug=${slug}`),
      ]);
      if (cancelled) return;
      if (!drinksRes.ok) {
        router.replace(`/?slug=${slug}`);
        return;
      }
      const drinksData = await drinksRes.json();
      setDrinks(drinksData.drinks);
      setLoading(false);
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.menuItems?.length) setMenuItems(sessionData.menuItems);
        if (sessionData.session?.barName) setBarName(sessionData.session.barName);
        if (sessionData.session?.tableCode) setTableCode(sessionData.session.tableCode);
        if (sessionData.session?.nickname) setNickname(sessionData.session.nickname);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  function showToastMsg(msg: string, undoFn: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undoFn });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  async function addDrink(name: string, category?: string) {
    setShowPicker(false);
    vibrate();
    pendingOps.current++;

    const existing = drinks.find((d) => d.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setDrinks((prev) =>
        prev.map((d) => (d.id === existing.id ? { ...d, count: d.count + 1 } : d))
      );
    } else {
      setDrinks((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, name, count: 1, category: category || null },
      ]);
    }

    try {
      const res = await fetch("/api/drinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, category }),
      });

      if (!res.ok) {
        fetchDrinks();
        return;
      }

      if (!existing) {
        const data = await res.json();
        if (data.drink) {
          setDrinks((prev) =>
            prev.map((d) =>
              d.name.toLowerCase() === name.toLowerCase() && d.id.startsWith("temp")
                ? { ...d, id: data.drink.id }
                : d
            )
          );
          showToastMsg(`${name} +1`, async () => {
            await fetch("/api/drinks", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug, drinkId: data.drink.id, delta: -1 }),
            });
            fetchDrinks();
          });
        }
      } else {
        showToastMsg(`${name} +1`, async () => {
          await fetch("/api/drinks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, drinkId: existing.id, delta: -1 }),
          });
          fetchDrinks();
        });
      }
    } catch {
      fetchDrinks();
    } finally {
      pendingOps.current--;
      if (pendingOps.current === 0) {
        fetchDrinks();
      }
    }
  }

  async function increment(drink: Drink) {
    vibrate();
    pendingOps.current++;
    setDrinks((prev) => prev.map((d) => (d.id === drink.id ? { ...d, count: d.count + 1 } : d)));

    try {
      const res = await fetch("/api/drinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: drink.name, category: drink.category }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          showToastMsg("Session expired", () => {});
          return;
        }
        // Rollback optimistic update
        setDrinks((prev) =>
          prev.map((d) => (d.id === drink.id ? { ...d, count: d.count - 1 } : d))
        );
        return;
      }
      showToastMsg(`${drink.name} +1`, async () => {
        await fetch("/api/drinks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, drinkId: drink.id, delta: -1 }),
        });
        fetchDrinks();
      });
    } catch {
      setDrinks((prev) => prev.map((d) => (d.id === drink.id ? { ...d, count: d.count - 1 } : d)));
    } finally {
      pendingOps.current--;
      if (pendingOps.current === 0) fetchDrinks();
    }
  }

  async function decrement(drink: Drink) {
    vibrate();
    pendingOps.current++;
    const prevCount = drink.count;
    if (drink.count <= 1) {
      setDrinks((prev) => prev.filter((d) => d.id !== drink.id));
    } else {
      setDrinks((prev) => prev.map((d) => (d.id === drink.id ? { ...d, count: d.count - 1 } : d)));
    }

    try {
      const res = await fetch("/api/drinks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, drinkId: drink.id, delta: -1 }),
      });
      if (!res.ok) {
        // Rollback
        setDrinks((prev) => {
          const exists = prev.find((d) => d.id === drink.id);
          if (exists) return prev.map((d) => (d.id === drink.id ? { ...d, count: prevCount } : d));
          return [...prev, { ...drink, count: prevCount }];
        });
      }
    } catch {
      setDrinks((prev) => {
        const exists = prev.find((d) => d.id === drink.id);
        if (exists) return prev.map((d) => (d.id === drink.id ? { ...d, count: prevCount } : d));
        return [...prev, { ...drink, count: prevCount }];
      });
    } finally {
      pendingOps.current--;
      if (pendingOps.current === 0) fetchDrinks();
    }
  }

  const total = drinks.reduce((sum, d) => sum + d.count, 0);
  const pace = getPace(drinks);
  const bgColor = getSessionHue(total);

  // Trigger badges and nudges on total change

  useEffect(() => {
    if (total === prevTotal.current) return;
    queueMicrotask(() => {
      const newBadge = getBadgeForCount(total);
      if (newBadge) setBadge(newBadge);
      const newNudge = getNudge(total, prevTotal.current);
      if (newNudge) {
        setNudge(newNudge);
        setTimeout(() => setNudge(null), 4000);
      }
      if (checkPersonalBest(total)) {
        if (!newBadge) {
          setBadge({
            emoji: "🏅",
            title: "Personal Best!",
            subtitle: `${total} drinks — new record`,
          });
        }
      }
      prevTotal.current = total;
    });
  }, [total]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] transition-colors duration-1000"
      style={{ backgroundColor: bgColor }}
    >
      {/* Badge popup */}
      {badge && <BadgeToast badge={badge} onDone={() => setBadge(null)} />}

      {/* Nudge */}
      {nudge && (
        <div className="fixed top-4 right-4 z-40 bg-surface/90 border border-border rounded-lg px-3 py-2 text-sm animate-pulse">
          {nudge.emoji} {nudge.text}
        </div>
      )}
      {/* Header */}
      <div className="text-center mb-6 relative">
        <div className="absolute left-0 top-0">
          <Button variant="ghost" size="sm" onPress={() => router.push("/")}>
            + New
          </Button>
        </div>
        <div className="absolute right-0 top-0 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              if (navigator.share) {
                navigator.share({
                  title: "TipsyTap",
                  text: `Join my session at ${titleCase(barName || slug)}`,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                showToastMsg("Link copied!", () => {});
              }
            }}
            aria-label="Share"
          >
            📤
          </Button>
          <ThemeSwitch />
        </div>
        <h1 className={`text-3xl font-bold ${total >= 10 ? "animate-wobble" : ""}`} key={total}>
          <Image src="/icon.svg" alt="" width={32} height={32} className="inline mr-2" />
          {total} drink{total !== 1 ? "s" : ""}
        </h1>
        {barName && <p className="text-base mt-1 text-foreground/70">{titleCase(barName)}</p>}
        <p className="text-sm mt-0.5 font-mono text-muted">
          {slug}
          <ElapsedTimer drinks={drinks} />
          {pace && (
            <>
              {" "}
              · {pace.emoji} {pace.label}
            </>
          )}
        </p>
      </div>

      {/* Summary link */}
      {drinks.length > 0 && (
        <div className="text-center mb-4">
          <Button variant="ghost" size="sm" onPress={() => router.push(`/s/${slug}/summary`)}>
            📊 Evening summary
          </Button>
        </div>
      )}

      {/* Drinks list */}
      {drinks.length === 0 ? (
        <div className="text-center text-muted mt-12">
          <p className="text-lg">No drinks yet</p>
          <p className="text-sm mt-2">Tap + to add your first drink</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {drinks.map((drink) => (
              <DrinkCard
                key={drink.id.startsWith("temp") ? drink.name : drink.id}
                drink={drink}
                onTap={() => increment(drink)}
                onLongPress={() => decrement(drink)}
                isTop={drinks.length > 1 && drink.count === Math.max(...drinks.map((d) => d.count))}
              />
            ))}
          </div>
          <p className="text-center text-muted text-xs mt-4">Long press to remove</p>
        </>
      )}

      {/* Table */}
      <TableView slug={slug} tableCode={tableCode} nickname={nickname} />

      {/* FAB */}
      <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center">
        <Button variant="primary" size="lg" onPress={() => setShowPicker(true)}>
          + Add a drink
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg z-40"
        >
          <span>{toast.msg}</span>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              toast.undoFn();
              setToast(null);
            }}
          >
            Undo
          </Button>
        </div>
      )}

      {/* Picker */}
      {showPicker && (
        <DrinkPicker
          menuItems={menuItems}
          currentDrinks={drinks}
          onSelect={addDrink}
          onClose={() => setShowPicker(false)}
        />
      )}

      <PwaInstallPrompt />
    </div>
  );
}
