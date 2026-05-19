"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<"start" | "bar" | "review">("start");
  const [barName, setBarName] = useState("");
  const [barSuggestions, setBarSuggestions] = useState<
    { id: string; barName: string; items: string[] }[]
  >([]);
  const [menuItems, setMenuItems] = useState<{ name: string; category: string }[]>([]);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Debounced bar search
  const searchBars = (q: string) => {
    setBarName(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setBarSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/menus?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setBarSuggestions(data.menus);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectBar = (bar: { barName: string; items: string[] }) => {
    setBarName(bar.barName);
    setBarSuggestions([]);
    if (bar.items.length > 0) {
      setMenuItems(bar.items.map((name: string) => ({ name, category: "other" })));
      createSession(bar.items.map((name: string) => ({ name, category: "other" })));
    } else {
      setMenuItems([]);
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Photo too large (max 4MB). Try a lower resolution.");
      return;
    }
    setParsing(true);
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await fetch("/api/parse-menu", { method: "POST", body: formData });
      const data = await res.json();
      const items = data.items || [];
      if (items.length > 0) {
        setMenuItems(items);
        setStep("review");
      } else {
        createSession([]);
      }
    } catch {
      createSession([]);
    } finally {
      setParsing(false);
    }
  };

  const createSession = async (items?: { name: string; category: string }[]) => {
    setCreating(true);
    try {
      const finalItems = items ?? menuItems;
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barName: barName || null,
          menuItems: finalItems.map((i) => i.name),
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const { slug } = await res.json();
      router.push(`/s/${slug}`);
    } catch {
      setCreating(false);
      alert("Could not create session. Please try again.");
    }
  };

  const removeItem = (idx: number) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== idx));
  };

  if (step === "start") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-bold mb-2">🍻</h1>
        <h2 className="text-2xl font-bold mb-8">Drinks Counter</h2>
        <button
          onClick={() => setStep("bar")}
          className="w-full max-w-xs bg-amber-500 text-black font-bold text-lg rounded-xl py-4 active:bg-amber-400 mb-6"
        >
          New evening
        </button>

        {/* Resume session by slug */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (slugInput.trim()) router.push(`/s/${slugInput.trim().toLowerCase()}`);
          }}
          className="w-full max-w-xs"
        >
          <input
            type="text"
            placeholder="Enter your session code…"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none text-center text-sm focus-visible:ring-2 focus-visible:ring-amber-400"
          />
        </form>
      </div>
    );
  }

  if (step === "bar") {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <h2 className="text-xl font-bold mb-4">Where are you?</h2>

        <input
          type="text"
          placeholder="Bar name…"
          value={barName}
          onChange={(e) => searchBars(e.target.value)}
          autoComplete="off"
          className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-2 text-white placeholder-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          autoFocus
        />

        {barSuggestions.length > 0 && (
          <div className="mb-4 space-y-1">
            {barSuggestions.map((bar) => (
              <button
                key={bar.id}
                onClick={() => selectBar(bar)}
                className="w-full text-left bg-gray-800 rounded-lg px-4 py-3 active:bg-gray-700"
              >
                <span className="font-medium">{bar.barName}</span>
                <span className="text-gray-400 text-sm ml-2">{bar.items.length} items</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 mt-6">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={parsing || barName.trim().length < 2}
            className="w-full bg-gray-800 rounded-xl py-4 text-center font-medium active:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Reading menu…
              </>
            ) : (
              "📷 Snap the menu"
            )}
          </button>

          <button
            onClick={() => {
              setMenuItems([]);
              createSession([]);
            }}
            disabled={barName.trim().length < 2 || creating}
            className="w-full bg-gray-800 rounded-xl py-4 text-center font-medium active:bg-gray-700 text-gray-400 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Skip — I\u2019ll add manually"}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
      </div>
    );
  }

  // Review step (only reached after photo parsing)
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 pb-24">
      <h2 className="text-xl font-bold mb-4">Review menu items</h2>

      {menuItems.length > 0 && (
        <div className="space-y-1 mb-6">
          {menuItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
            >
              <span>{item.name}</span>
              <button
                onClick={() => removeItem(idx)}
                aria-label={`Remove ${item.name}`}
                className="text-gray-400 text-xl px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-400 text-sm mb-6">
        Remove any junk. You can always add more drinks later.
      </p>

      <button
        onClick={() => createSession()}
        disabled={creating}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-bold text-lg rounded-full px-8 py-4 shadow-lg active:bg-amber-400 disabled:opacity-50 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {creating ? "Creating…" : "Start counting 🍺"}
      </button>
    </div>
  );
}
