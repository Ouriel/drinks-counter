"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Spinner } from "@heroui/react";
import { ThemeSwitch } from "@/lib/theme-switch";
import { DrinkCard } from "@/components/DrinkCard";
import { DrinkPicker } from "@/components/DrinkPicker";
import { QrCode } from "@/components/QrCode";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
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

export default function SessionPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [barName, setBarName] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; undoFn: () => void } | null>(null);
  const [showQr, setShowQr] = useState(false);
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

    const existing = drinks.find((d) => d.name === name);
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
        pendingOps.current--;
        fetchDrinks();
        return;
      }

      if (!existing) {
        const data = await res.json();
        if (data.drink) {
          setDrinks((prev) =>
            prev.map((d) =>
              d.name === name && d.id.startsWith("temp") ? { ...d, id: data.drink.id } : d
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
    } finally {
      pendingOps.current--;
      // Reconcile after all pending ops complete
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
      await fetch("/api/drinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: drink.name, category: drink.category }),
      });
      showToastMsg(`${drink.name} +1`, async () => {
        await fetch("/api/drinks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, drinkId: drink.id, delta: -1 }),
        });
        fetchDrinks();
      });
    } finally {
      pendingOps.current--;
      if (pendingOps.current === 0) fetchDrinks();
    }
  }

  async function decrement(drink: Drink) {
    vibrate();
    pendingOps.current++;
    if (drink.count <= 1) {
      setDrinks((prev) => prev.filter((d) => d.id !== drink.id));
    } else {
      setDrinks((prev) => prev.map((d) => (d.id === drink.id ? { ...d, count: d.count - 1 } : d)));
    }

    try {
      await fetch("/api/drinks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, drinkId: drink.id, delta: -1 }),
      });
    } finally {
      pendingOps.current--;
      if (pendingOps.current === 0) fetchDrinks();
    }
  }

  const total = drinks.reduce((sum, d) => sum + d.count, 0);
  const elapsed = formatElapsed(drinks);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="text-center mb-6 relative">
        <div className="absolute left-0 top-0">
          <Button variant="ghost" size="sm" onPress={() => router.push("/")}>
            + New
          </Button>
        </div>
        <div className="absolute right-0 top-0 flex items-center gap-1">
          <Button variant="ghost" size="sm" onPress={() => setShowQr(true)} aria-label="QR Code">
            📱
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              if (navigator.share) {
                navigator.share({
                  title: "TipsyTap",
                  text: `Join my session at ${barName || slug}`,
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
        <h1 className="text-3xl font-bold">
          <Image src="/icon.svg" alt="" width={32} height={32} className="inline mr-2" />
          {total} drink{total !== 1 ? "s" : ""}
        </h1>
        {barName && <p className="text-base mt-1 text-foreground/70">{barName}</p>}
        <p className="text-sm mt-0.5 font-mono text-muted">
          {slug}
          {elapsed && ` · ⏱ ${elapsed}`}
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
              />
            ))}
          </div>
          <p className="text-center text-muted text-xs mt-4">Long press to remove</p>
        </>
      )}

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

      {/* QR Code modal */}
      {showQr && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-surface rounded-2xl p-6 text-center max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Scan to join</h3>
            <QrCode url={typeof window !== "undefined" ? window.location.href : ""} />
            <p className="text-sm text-muted mt-4 font-mono">{slug}</p>
            <Button variant="ghost" size="sm" className="mt-4" onPress={() => setShowQr(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      <PwaInstallPrompt />
    </div>
  );
}
