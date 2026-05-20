"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button, Input, Card, Chip, Spinner } from "@heroui/react";
import { ThemeSwitch } from "@/lib/theme-switch";
import { CATEGORY_EMOJI } from "@/lib/constants";
import imageCompression from "browser-image-compression";

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredSlug = searchParams.get("slug") || "";
  const [step, setStep] = useState<"start" | "bar" | "review">(preferredSlug ? "bar" : "start");
  const [barName, setBarName] = useState("");
  const [barSuggestions, setBarSuggestions] = useState<
    { id: string; barName: string; items: { name: string; category: string }[] }[]
  >([]);
  const [osmResults, setOsmResults] = useState<{ name: string; address: string }[]>([]);
  const [menuItems, setMenuItems] = useState<{ name: string; category: string }[]>([]);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [recentSessions] = useState<{ slug: string; barName: string; date: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("tipsytap_recent");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Get geolocation once on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  const searchBars = (q: string) => {
    setBarName(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setBarSuggestions([]);
      setOsmResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      // Search existing DB
      const res = await fetch(`/api/menus?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setBarSuggestions(data.menus);

      // Search OSM if no DB results
      if (data.menus.length === 0) {
        const geo = geoRef.current;
        const params = new URLSearchParams({ q });
        if (geo) {
          params.set("lat", String(geo.lat));
          params.set("lng", String(geo.lng));
        }
        const osmRes = await fetch(`/api/bars/search?${params}`);
        const osmData = await osmRes.json();
        setOsmResults(osmData.results || []);
      } else {
        setOsmResults([]);
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectBar = (bar: { barName: string; items: { name: string; category: string }[] }) => {
    setBarName(bar.barName);
    setBarSuggestions([]);
    setMenuItems(bar.items);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setParsing(true);
    const allItems: { name: string; category: string }[] = [...menuItems];
    const seen = new Set(allItems.map((i) => i.name.toLowerCase()));

    for (const file of files) {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      const formData = new FormData();
      formData.append("photo", compressed);
      try {
        const res = await fetch("/api/parse-menu", { method: "POST", body: formData });
        const data = await res.json();
        for (const item of data.items || []) {
          const name = item.name.toLowerCase().trim();
          if (name && !seen.has(name)) {
            seen.add(name);
            allItems.push({ name, category: item.category });
          }
        }
      } catch {
        /* continue */
      }
    }

    setParsing(false);
    if (allItems.length > menuItems.length) {
      setMenuItems(allItems);
      setStep("review");
    } else {
      createSession([]);
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
          menuItems: finalItems,
          slug: preferredSlug || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { slug } = await res.json();
      // Save to recent sessions
      try {
        const recent = JSON.parse(localStorage.getItem("tipsytap_recent") || "[]");
        const entry = { slug, barName: barName || slug, date: new Date().toISOString() };
        const updated = [entry, ...recent.filter((s: { slug: string }) => s.slug !== slug)].slice(
          0,
          10
        );
        localStorage.setItem("tipsytap_recent", JSON.stringify(updated));
      } catch {}
      router.push(`/s/${slug}`);
    } catch {
      setCreating(false);
      setErrorMsg("Could not create session. Please try again.");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const removeItem = (idx: number) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const editItem = (idx: number, newName: string) => {
    setMenuItems((prev) => prev.map((item, i) => (i === idx ? { ...item, name: newName } : item)));
  };

  // === START SCREEN ===
  if (step === "start") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 relative">
        {errorMsg && <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />}
        <div className="absolute right-4 top-4">
          <ThemeSwitch />
        </div>
        <div className="text-center">
          <Image src="/icon.svg" alt="TipsyTap" width={120} height={120} className="mx-auto mb-4" />
          <h1 className="text-4xl font-bold">TipsyTap</h1>
          <p className="text-muted mt-2">Tap to track the tipsy</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <Button variant="primary" size="lg" className="w-full" onPress={() => setStep("bar")}>
            New evening
          </Button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (slugInput.trim()) router.push(`/s/${slugInput.trim().toLowerCase()}`);
            }}
            className="relative"
          >
            <Input
              className="w-full"
              placeholder="Session code…"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
            />
            {slugInput.trim() && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-accent font-bold text-lg"
                aria-label="Go to session"
              >
                →
              </button>
            )}
          </form>
          {recentSessions.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted mb-2">Recent sessions</p>
              <div className="space-y-1">
                {recentSessions.map((s) => (
                  <Card key={s.slug}>
                    <button
                      type="button"
                      onClick={() => router.push(`/s/${s.slug}`)}
                      className="w-full text-left px-3 py-2 cursor-pointer"
                    >
                      <span className="font-medium text-sm">{s.barName}</span>
                      <span className="text-muted text-xs ml-2">
                        {new Date(s.date).toLocaleDateString()}
                      </span>
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

  // === BAR NAME STEP ===
  if (step === "bar") {
    return (
      <div className="min-h-screen p-6">
        {errorMsg && <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />}
        <div className="flex items-center gap-2 mb-4">
          <Image src="/icon.svg" alt="" width={24} height={24} />
          <h2 className="text-xl font-bold">Where are you?</h2>
        </div>

        <Input
          className="w-full mb-3"
          placeholder="Bar name…"
          value={barName}
          onChange={(e) => searchBars(e.target.value)}
          autoComplete="off"
          autoFocus
        />

        {barSuggestions.length > 0 && (
          <div className="mb-4 space-y-2">
            {barSuggestions.map((bar) => (
              <Card key={bar.id}>
                <button
                  type="button"
                  onClick={() => selectBar(bar)}
                  className="w-full text-left p-3 cursor-pointer"
                >
                  <span className="font-medium">{bar.barName}</span>
                  <span className="text-muted text-sm ml-2">{bar.items.length} items</span>
                </button>
              </Card>
            ))}
          </div>
        )}

        {osmResults.length > 0 && barSuggestions.length === 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-muted">📍 Nearby places</p>
            {osmResults.map((place, i) => (
              <Card key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setBarName(place.name);
                    setOsmResults([]);
                  }}
                  className="w-full text-left p-3 cursor-pointer"
                >
                  <span className="font-medium">{place.name}</span>
                  {place.address && (
                    <span className="text-muted text-sm block">{place.address}</span>
                  )}
                </button>
              </Card>
            ))}
          </div>
        )}

        {barName.length >= 2 &&
          barSuggestions.length === 0 &&
          osmResults.length === 0 &&
          !parsing && (
            <p className="text-sm text-muted text-center mb-4">
              📸 No results — take a photo of the menu to get started!
            </p>
          )}

        <div className="space-y-3 mt-6">
          {menuItems.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isDisabled={creating}
              onPress={() => createSession()}
            >
              {creating ? "Creating…" : `Start (${menuItems.length} drinks)`}
            </Button>
          )}

          {parsing ? (
            <div className="w-full text-center py-4 flex items-center justify-center gap-2 text-foreground">
              <Spinner size="sm" />
              <span>Reading menu…</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="lg"
                className="flex-1 text-foreground"
                isDisabled={barName.trim().length < 2}
                onPress={() => cameraRef.current?.click()}
              >
                📸 Camera
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="flex-1 text-foreground"
                isDisabled={barName.trim().length < 2}
                onPress={() => fileRef.current?.click()}
              >
                📁 Gallery
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="lg"
            className="w-full text-foreground/60"
            isDisabled={barName.trim().length < 2 || creating}
            onPress={() => createSession([])}
          >
            Skip — I&apos;ll add manually
          </Button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhoto}
          className="hidden"
        />
      </div>
    );
  }

  // === REVIEW STEP ===
  return (
    <div className="min-h-screen p-6 pb-24">
      <h2 className="text-xl font-bold mb-4">Review menu items</h2>

      {menuItems.length > 0 && (
        <div className="space-y-1 mb-6">
          {menuItems.map((item, idx) => (
            <Card key={idx}>
              <div className="px-3 py-2 flex items-center gap-2">
                <Chip size="sm">{CATEGORY_EMOJI[item.category] || "🍹"}</Chip>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => editItem(idx, e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => removeItem(idx)}
                  aria-label={`Remove ${item.name}`}
                >
                  ×
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted text-sm mb-6">
        Tap a name to edit. Remove junk. You can add more later.
      </p>

      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 pb-[env(safe-area-inset-bottom)]">
        <Button variant="primary" size="lg" isDisabled={creating} onPress={() => createSession()}>
          {creating ? "Creating…" : "Start counting 🍺"}
        </Button>
      </div>
    </div>
  );
}

function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      role="alert"
      className="fixed top-4 left-1/2 -translate-x-1/2 bg-danger/10 border border-danger/30 text-danger rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg z-50"
    >
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="text-danger/60 hover:text-danger font-bold">
        ×
      </button>
    </div>
  );
}
