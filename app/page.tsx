"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button, Input, Card, Chip, Spinner, toast } from "@heroui/react";
import { ThemeSwitch } from "@/lib/theme-switch";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { api } from "@/lib/api";

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

  const searchBars = (q: string) => {
    setBarName(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setBarSuggestions([]);
      setOsmResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.searchMenus(q);
        if (!data) return;
        setBarSuggestions(data.menus);

        // Search OSM if no DB results
        if (data.menus.length === 0) {
          // Lazy geolocation: request only when needed for OSM search
          if (!geoRef.current && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              },
              () => {},
              { timeout: 5000 }
            );
          }
          const geo = geoRef.current;
          const params = new URLSearchParams({ q });
          if (geo) {
            params.set("lat", String(geo.lat));
            params.set("lng", String(geo.lng));
          }
          const osmData = await api.searchBars(params);
          setOsmResults(osmData?.results || []);
        } else {
          setOsmResults([]);
        }
      } catch {
        // Network error — silently ignore for search
      }
    }, 300);
  };

  const selectBar = (bar: { barName: string; items: { name: string; category: string }[] }) => {
    setBarName(bar.barName);
    setBarSuggestions([]);
    setMenuItems(bar.items);
  };

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setParsing(true);
    const { default: imageCompression } = await import("browser-image-compression");
    const allItems: { name: string; category: string }[] = [...menuItems];
    const seen = new Set(allItems.map((item) => item.name.toLowerCase()));

    for (const file of files) {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      const formData = new FormData();
      formData.append("photo", compressed);
      try {
        const data = await api.parseMenu(formData);
        for (const item of data.items) {
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
      const data = await api.createSession({
        barName: barName.trim() || null,
        menuItems: finalItems,
        slug: preferredSlug || undefined,
      });
      if (!data) throw new Error("Failed");
      const { slug } = data;
      // Save to recent sessions
      try {
        const recent = JSON.parse(localStorage.getItem("tipsytap_recent") || "[]");
        const entry = { slug, barName: barName || slug, date: new Date().toISOString() };
        const updated = [
          entry,
          ...recent.filter((session: { slug: string }) => session.slug !== slug),
        ].slice(0, 10);
        localStorage.setItem("tipsytap_recent", JSON.stringify(updated));
      } catch {}
      router.push(`/s/${slug}`);
    } catch {
      setCreating(false);
      toast.danger("Could not create session. Please try again.");
    }
  };

  const removeItem = (idx: number) => {
    setMenuItems((prev) => prev.filter((_, index) => index !== idx));
  };

  const editItem = (idx: number, newName: string) => {
    setMenuItems((prev) => prev.map((item, i) => (i === idx ? { ...item, name: newName } : item)));
  };

  // === START SCREEN ===
  if (step === "start") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 relative">
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
            Start counting
          </Button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (slugInput.trim()) router.push(`/s/${slugInput.trim().toLowerCase()}`);
            }}
            className="relative"
          >
            <Input
              className="w-full"
              placeholder="Session code…"
              value={slugInput}
              onChange={(event) => setSlugInput(event.target.value)}
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
                {recentSessions.map((session) => (
                  <Card key={session.slug}>
                    <button
                      type="button"
                      onClick={() => router.push(`/s/${session.slug}`)}
                      className="w-full text-left px-3 py-2 cursor-pointer"
                    >
                      <span className="font-medium text-sm">{session.barName}</span>
                      <span className="text-muted text-xs ml-2">
                        {new Date(session.date).toLocaleDateString()}
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
        <div className="flex items-center gap-2 mb-4">
          <Image src="/icon.svg" alt="" width={24} height={24} />
          <h2 className="text-xl font-bold">Where are you?</h2>
        </div>

        <Input
          className="w-full mb-3"
          placeholder="Bar name…"
          value={barName}
          onChange={(event) => searchBars(event.target.value)}
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
                  onChange={(event) => editItem(idx, event.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground"
                  aria-label={`Edit drink name: ${item.name}`}
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
