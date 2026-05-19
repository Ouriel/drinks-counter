"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

type Drink = { id: string; name: string; count: number; category: string | null };
type MenuItem = { name: string; category: string };

function vibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10);
  }
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
        if (sessionData.session?.barName) {
          setBarName(sessionData.session.barName);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

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
      setDrinks((prev) =>
        prev.map((d) => (d.id === existing.id ? { ...d, count: d.count + 1 } : d))
      );
    } else {
      setDrinks((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, name, count: 1, category: category || null },
      ]);
    }

    const res = await fetch("/api/drinks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, category }),
    });

    if (!res.ok) {
      fetchDrinks(); // Revert on failure
      return;
    }

    // Only fetch to sync IDs for new drinks (needed for undo)
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
  }

  async function increment(drink: Drink) {
    vibrate();
    setDrinks((prev) => prev.map((d) => (d.id === drink.id ? { ...d, count: d.count + 1 } : d)));

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
  }

  async function decrement(drink: Drink) {
    vibrate();
    if (drink.count <= 1) {
      setDrinks((prev) => prev.filter((d) => d.id !== drink.id));
    } else {
      setDrinks((prev) => prev.map((d) => (d.id === drink.id ? { ...d, count: d.count - 1 } : d)));
    }

    await fetch("/api/drinks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, drinkId: drink.id, delta: -1 }),
    });
  }

  const total = drinks.reduce((sum, d) => sum + d.count, 0);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl text-white">Loading…</div>
    );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">
          🍻 {total} drink{total !== 1 ? "s" : ""}
        </h1>
        {barName && <p className="text-gray-300 text-sm mt-1">{barName}</p>}
        <p className="text-gray-500 text-xs mt-0.5 font-mono">{slug}</p>
      </div>

      {drinks.length === 0 ? (
        <div className="text-center text-gray-400 mt-12">
          <p className="text-lg">No drinks yet</p>
          <p className="text-sm mt-2">Tap + to add your first drink</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {drinks.map((drink) => (
              <DrinkCard
                key={drink.id}
                drink={drink}
                onTap={() => increment(drink)}
                onLongPress={() => decrement(drink)}
              />
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs mt-4">Long press to remove</p>
        </>
      )}

      <button
        onClick={() => setShowPicker(true)}
        aria-label="Add a drink"
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-amber-500 text-black font-bold text-lg rounded-full px-8 py-4 shadow-lg active:bg-amber-400 hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 outline-none"
      >
        + Add a drink
      </button>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg z-40"
        >
          <span>{toast.msg}</span>
          <button
            onClick={() => {
              toast.undoFn();
              setToast(null);
            }}
            aria-label="Undo last action"
            className="text-amber-400 font-medium"
          >
            Undo
          </button>
        </div>
      )}

      {showPicker && (
        <DrinkPicker
          menuItems={menuItems}
          currentDrinks={drinks}
          onSelect={addDrink}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function DrinkCard({
  drink,
  onTap,
  onLongPress,
}: {
  drink: Drink;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const timerRef = useRef<NodeJS.Timeout>(null);
  const longPressed = useRef(false);
  const isTouchDevice = useRef(false);

  const handleTouchStart = () => {
    isTouchDevice.current = true;
    longPressed.current = false;
    timerRef.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!longPressed.current) onTap();
  };

  const handleMouseDown = () => {
    if (isTouchDevice.current) return;
    longPressed.current = false;
    timerRef.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 500);
  };

  const handleMouseUp = () => {
    if (isTouchDevice.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!longPressed.current) onTap();
  };

  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${drink.name}, ${drink.count}. Tap to add one, long press to remove one`}
      className="w-full flex items-center justify-between bg-gray-800 rounded-xl p-4 active:bg-gray-700 transition-[background-color] select-none focus-visible:ring-2 focus-visible:ring-amber-400 outline-none"
    >
      <div className="text-left">
        <span className="text-lg font-medium">{drink.name}</span>
        {drink.category && <span className="ml-2 text-xs text-gray-400">{drink.category}</span>}
      </div>
      <span className="text-2xl font-bold tabular-nums">{drink.count}</span>
    </button>
  );
}

function DrinkPicker({
  menuItems,
  currentDrinks,
  onSelect,
  onClose,
}: {
  menuItems: MenuItem[];
  currentDrinks: Drink[];
  onSelect: (name: string, category?: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const currentNames = new Set(currentDrinks.map((d) => d.name));
  const filtered = menuItems.filter(
    (item) => item.name.toLowerCase().includes(search.toLowerCase()) && !currentNames.has(item.name)
  );

  const grouped = filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const showAddCustom =
    search.trim().length > 0 &&
    !menuItems.some((item) => item.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 rounded-t-2xl mt-12 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Pick a drink</h2>
          <button
            onClick={onClose}
            aria-label="Close picker"
            className="text-gray-400 text-2xl px-2"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim()) onSelect(search.trim());
          }}
          className="mb-4"
        >
          <input
            type="text"
            placeholder="Search or type a new drink…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search or add drink"
            className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            autoFocus
          />
        </form>

        {showAddCustom && (
          <button
            onClick={() => onSelect(search.trim())}
            className="w-full text-left bg-amber-500/20 border border-amber-500/50 rounded-lg px-4 py-3 mb-4 text-amber-300 active:bg-amber-500/30"
          >
            + Add &quot;{search.trim()}&quot;
          </button>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-4">
            <h3 className="text-sm text-gray-400 uppercase mb-2">{category}</h3>
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onSelect(item.name, item.category)}
                  className="w-full text-left bg-gray-800 rounded-lg px-4 py-3 active:bg-gray-700 text-white"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        {!filtered.length && !showAddCustom && !search && currentDrinks.length === 0 && (
          <p className="text-gray-400 text-center mt-8">Type a drink name to add it</p>
        )}

        {currentDrinks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm text-gray-400 uppercase mb-2">Already ordered</h3>
            <div className="space-y-1">
              {currentDrinks.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onSelect(d.name, d.category || undefined)}
                  className="w-full text-left bg-gray-800 rounded-lg px-4 py-3 active:bg-gray-700 flex justify-between text-white"
                >
                  <span>{d.name}</span>
                  <span className="text-gray-400">×{d.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
