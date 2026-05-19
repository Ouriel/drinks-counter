"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button, Input, Card } from "@heroui/react";
import { ThemeSwitch } from "@/lib/theme-switch";
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
    { id: string; barName: string; items: string[] }[]
  >([]);
  const [menuItems, setMenuItems] = useState<{ name: string; category: string }[]>([]);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const searchBars = (q: string) => {
    setBarName(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setBarSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/menus?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setBarSuggestions(data.menus);
    }, 300);
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const selectBar = (bar: { barName: string; items: string[] }) => {
    setBarName(bar.barName);
    setBarSuggestions([]);
    setMenuItems(bar.items.map((name: string) => ({ name, category: "other" })));
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
      } catch { /* continue */ }
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
          menuItems: finalItems.map((i) => i.name),
          slug: preferredSlug || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
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

  const editItem = (idx: number, newName: string) => {
    setMenuItems((prev) => prev.map((item, i) => (i === idx ? { ...item, name: newName } : item)));
  };

  // === START SCREEN ===
  if (step === "start") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 relative">
        <div className="absolute right-4 top-4"><ThemeSwitch /></div>
        <div className="text-center">
          <Image src="/icon.svg" alt="TipsyTap" width={80} height={80} className="mx-auto mb-4" />
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
          onChange={(e) => searchBars(e.target.value)}
          autoComplete="off"
          autoFocus
        />

        {barSuggestions.length > 0 && (
          <div className="mb-4 space-y-2">
            {barSuggestions.map((bar) => (
              <Card key={bar.id}>
                <button type="button" onClick={() => selectBar(bar)} className="w-full text-left p-3 cursor-pointer">
                  <span className="font-medium">{bar.barName}</span>
                  <span className="text-muted text-sm ml-2">{bar.items.length} items</span>
                </button>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-3 mt-6">
          {menuItems.length > 0 && (
            <Button variant="primary" size="lg" className="w-full" isDisabled={creating} onPress={() => createSession()}>
              {creating ? "Creating…" : `Start (${menuItems.length} drinks)`}
            </Button>
          )}

          {parsing ? (
            <div className="w-full text-center py-4 flex items-center justify-center gap-2 text-foreground">
              <span className="inline-block w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              Reading menu…
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
            Skip — I'll add manually
          </Button>
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} className="hidden" />
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
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => editItem(idx, e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground"
                />
                <Button variant="ghost" size="sm" onPress={() => removeItem(idx)} aria-label={`Remove ${item.name}`}>
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
