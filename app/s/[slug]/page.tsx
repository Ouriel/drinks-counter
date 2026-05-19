"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Input, Card } from "@heroui/react";
import { ThemeSwitch } from "@/lib/theme-switch";

type Drink = { id: string; name: string; count: number; category: string | null };
type MenuItem = { name: string; category: string };

function vibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
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
  const toastTimer = useRef<NodeJS.Timeout>(null);

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
        if (sessionData.menuItems?.length) {
          setMenuItems(sessionData.menuItems.map((name: string) => ({ name, category: "other" })));
        }
        if (sessionData.session?.barName) setBarName(sessionData.session.barName);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug, router]);

  async function fetchDrinks() {
    const res = await fetch(`/api/drinks?slug=${slug}`);
    if (!res.ok) return;
    const data = await res.json();
    setDrinks(data.drinks);
  }

  function showToastMsg(msg: string, undoFn: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undoFn });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  async function addDrink(name: string, category?: string) {
    setShowPicker(false);
    vibrate();
    const existing = drinks.find((d) => d.name === name);
    if (existing) {
      setDrinks((prev) => prev.map((d) => (d.id === existing.id ? { ...d, count: d.count + 1 } : d)));
    } else {
      setDrinks((prev) => [...prev, { id: `temp-${Date.now()}`, name, count: 1, category: category || null }]);
    }

    const res = await fetch("/api/drinks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, category }),
    });

    if (!res.ok) { fetchDrinks(); return; }

    if (!existing) {
      const data = await res.json();
      if (data.drink) {
        setDrinks((prev) => prev.map((d) => (d.name === name && d.id.startsWith("temp") ? { ...d, id: data.drink.id } : d)));
        showToastMsg(`${name} +1`, async () => {
          await fetch("/api/drinks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, drinkId: data.drink.id, delta: -1 }) });
          fetchDrinks();
        });
      }
    } else {
      showToastMsg(`${name} +1`, async () => {
        await fetch("/api/drinks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, drinkId: existing.id, delta: -1 }) });
        fetchDrinks();
      });
    }
  }

  async function increment(drink: Drink) {
    vibrate();
    setDrinks((prev) => prev.map((d) => (d.id === drink.id ? { ...d, count: d.count + 1 } : d)));
    await fetch("/api/drinks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, name: drink.name, category: drink.category }) });
    showToastMsg(`${drink.name} +1`, async () => {
      await fetch("/api/drinks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, drinkId: drink.id, delta: -1 }) });
      fetchDrinks();
    });
  }

  async function decrement(drink: Drink) {
    vibrate();
    if (drink.count <= 1) {
      setDrinks((prev) => prev.filter((d) => d.id !== drink.id));
    } else {
      setDrinks((prev) => prev.map((d) => (d.id === drink.id ? { ...d, count: d.count - 1 } : d)));
    }
    await fetch("/api/drinks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, drinkId: drink.id, delta: -1 }) });
  }

  const total = drinks.reduce((sum, d) => sum + d.count, 0);

  if (loading) return <div className="flex items-center justify-center h-screen text-xl animate-pulse">Loading…</div>;

  return (
    <div className="min-h-screen p-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="text-center mb-6 relative">
        <div className="absolute left-0 top-0">
          <Button variant="ghost" size="sm" onPress={() => router.push("/")}>+ New</Button>
        </div>
        <div className="absolute right-0 top-0"><ThemeSwitch /></div>
        <h1 className="text-3xl font-bold"><Image src="/icon.svg" alt="" width={32} height={32} className="inline mr-2" />{total} drink{total !== 1 ? "s" : ""}</h1>
        {barName && <p className="text-base mt-1 text-foreground/70">{barName}</p>}
        <p className="text-sm mt-0.5 font-mono text-muted">{slug}</p>
      </div>

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
              <DrinkCard key={drink.id.startsWith("temp") ? drink.name : drink.id} drink={drink} onTap={() => increment(drink)} onLongPress={() => decrement(drink)} />
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
        <div role="status" aria-live="polite" className="fixed top-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg z-40">
          <span>{toast.msg}</span>
          <Button variant="ghost" size="sm" onPress={() => { toast.undoFn(); setToast(null); }}>Undo</Button>
        </div>
      )}

      {/* Picker */}
      {showPicker && (
        <DrinkPicker menuItems={menuItems} currentDrinks={drinks} onSelect={addDrink} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}

function DrinkCard({ drink, onTap, onLongPress }: { drink: Drink; onTap: () => void; onLongPress: () => void }) {
  const timerRef = useRef<NodeJS.Timeout>(null);
  const longPressed = useRef(false);
  const isTouchDevice = useRef(false);

  const handleTouchStart = () => { isTouchDevice.current = true; longPressed.current = false; timerRef.current = setTimeout(() => { longPressed.current = true; onLongPress(); }, 500); };
  const handleTouchEnd = () => { if (timerRef.current) clearTimeout(timerRef.current); if (!longPressed.current) onTap(); };
  const handleMouseDown = () => { if (isTouchDevice.current) return; longPressed.current = false; timerRef.current = setTimeout(() => { longPressed.current = true; onLongPress(); }, 500); };
  const handleMouseUp = () => { if (isTouchDevice.current) return; if (timerRef.current) clearTimeout(timerRef.current); if (!longPressed.current) onTap(); };

  return (
    <Card>
      <button
        type="button"
        className="w-full p-4 flex items-center justify-between select-none cursor-pointer active:scale-[0.98] transition-transform"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`${drink.name}, ${drink.count}. Tap to add, long press to remove`}
      >
        <div>
          <span className="text-xl font-medium">{drink.name}</span>
          {drink.category && <span className="ml-2 text-sm text-muted">{drink.category}</span>}
        </div>
        <span className="text-3xl font-bold tabular-nums">{drink.count}</span>
      </button>
    </Card>
  );
}

function DrinkPicker({ menuItems, currentDrinks, onSelect, onClose }: { menuItems: MenuItem[]; currentDrinks: Drink[]; onSelect: (name: string, category?: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");

  const currentNames = new Set(currentDrinks.map((d) => d.name));
  const filtered = menuItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) && !currentNames.has(item.name));
  const grouped = filtered.reduce<Record<string, MenuItem[]>>((acc, item) => { const cat = item.category || "other"; if (!acc[cat]) acc[cat] = []; acc[cat].push(item); return acc; }, {});
  const showAddCustom = search.trim().length > 0 && !menuItems.some((item) => item.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface rounded-t-2xl mt-12 flex-1 overflow-y-auto overscroll-contain p-4">
        {/* Swipe indicator */}
        <div className="w-10 h-1 bg-muted/40 rounded-full mx-auto mb-3" />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Pick a drink</h2>
          <Button variant="ghost" size="sm" onPress={onClose} aria-label="Close">×</Button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (search.trim()) onSelect(search.trim()); }} className="mb-4">
          <Input className="w-full"
            placeholder="Search or type a new drink…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </form>

        {showAddCustom && (
          <Button variant="ghost" className="w-full mb-4 border border-accent/50 text-accent" onPress={() => onSelect(search.trim())}>
            + Add &quot;{search.trim()}&quot;
          </Button>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-4">
            <h3 className="text-sm text-muted uppercase mb-2">{category}</h3>
            <div className="space-y-1">
              {items.map((item) => (
                <Card key={item.name}>
                  <button type="button" onClick={() => onSelect(item.name, item.category)} className="w-full text-left p-3 cursor-pointer">
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

        {currentDrinks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm text-muted uppercase mb-2">Already ordered · tap for +1</h3>
            <div className="space-y-1">
              {currentDrinks.map((d) => (
                <Card key={d.id}>
                  <button type="button" onClick={() => onSelect(d.name, d.category || undefined)} className="w-full text-left p-3 cursor-pointer flex justify-between">
                    <span>{d.name}</span>
                    <span className="text-muted">×{d.count}</span>
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
