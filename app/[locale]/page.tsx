"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button, Input, Card, Chip, Spinner, toast } from "@heroui/react";
import { useTranslations } from "next-intl";
import { ChartColumn, MapPin, Camera, Beer } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { ThemeSwitch } from "@/lib/theme-switch";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { CategoryIcon } from "@/lib/category-icon";
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
  const t = useTranslations();
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
      const parsed: { slug: string; barName: string; date: string }[] = stored
        ? JSON.parse(stored)
        : [];
      // Sessions have a 48h TTL — drop stale local entries on open.
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const fresh = parsed.filter((session) => {
        const time = new Date(session.date).getTime();
        return !Number.isNaN(time) && time >= cutoff;
      });
      if (fresh.length !== parsed.length) {
        localStorage.setItem("tipsytap_recent", JSON.stringify(fresh));
      }
      return fresh;
    } catch {
      return [];
    }
  });
  const cameraRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
      try {
        // Fire DB and OSM searches in parallel
        const menuPromise = api.searchMenus(q);

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
        const osmPromise = api.searchBars(params);

        const [data, osmData] = await Promise.all([menuPromise, osmPromise]);
        if (data) setBarSuggestions(data.menus);
        setOsmResults(osmData?.results || []);
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
      toast.danger(t("session.couldNotCreate"));
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
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeSwitch />
        </div>
        <div className="text-center">
          <Image
            src="/icon.svg"
            alt="TipsyTap"
            width={160}
            height={160}
            priority
            className="mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold">{t("app.title")}</h1>
          <p className="text-default-500 mt-2">{t("app.tagline")}</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <Button variant="primary" size="lg" className="w-full" onPress={() => setStep("bar")}>
            {t("home.startCounting")}
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
              placeholder={t("home.sessionCode")}
              value={slugInput}
              onChange={(event) => setSlugInput(event.target.value)}
            />
            {slugInput.trim() && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-accent font-bold text-lg"
                aria-label={t("home.goToSession")}
              >
                →
              </button>
            )}
          </form>
          {recentSessions.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-default-500 mb-2">{t("home.recentSessions")}</p>
              <div className="space-y-1">
                {recentSessions.map((session) => (
                  <Card key={session.slug}>
                    <button
                      type="button"
                      onClick={() => router.push(`/s/${session.slug}`)}
                      className="w-full text-left px-3 py-2 cursor-pointer"
                    >
                      <span className="font-medium text-sm">{session.barName}</span>
                      <span className="text-default-500 text-xs ml-2">
                        {new Date(session.date).toLocaleDateString()}
                      </span>
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onPress={() => router.push("/stats")}>
          <ChartColumn className="w-4 h-4" />
          {t("home.stats")}
        </Button>
      </div>
    );
  }

  // === BAR NAME STEP ===
  if (step === "bar") {
    return (
      <div className="min-h-screen p-6">
        <div className="flex items-center gap-2 mb-4">
          <Image src="/icon.svg" alt="" width={24} height={24} />
          <h2 className="text-xl font-bold">{t("bar.whereAreYou")}</h2>
        </div>

        <Input
          className="w-full mb-3"
          placeholder={t("bar.barName")}
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
                  <span className="text-default-500 text-sm ml-2">
                    {t("bar.items", { count: bar.items.length })}
                  </span>
                </button>
              </Card>
            ))}
          </div>
        )}

        {osmResults.length > 0 && barSuggestions.length === 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-default-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {t("bar.nearbyPlaces")}
            </p>
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
                    <span className="text-default-500 text-sm block">{place.address}</span>
                  )}
                </button>
              </Card>
            ))}
          </div>
        )}

        {barName.length >= 2 &&
          barSuggestions.length === 0 &&
          osmResults.length === 0 &&
          menuItems.length === 0 &&
          !parsing && (
            <p className="text-sm text-default-500 text-center mb-4">{t("bar.noResultsPhoto")}</p>
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
              {creating ? t("bar.creating") : t("bar.start", { count: menuItems.length })}
            </Button>
          )}

          {parsing ? (
            <div className="w-full text-center py-4 flex items-center justify-center gap-2 text-foreground">
              <Spinner size="sm" />
              <span>{t("bar.readingMenu")}</span>
            </div>
          ) : (
            menuItems.length === 0 && (
              <Button
                variant="ghost"
                size="lg"
                className="w-full text-foreground gap-1"
                isDisabled={barName.trim().length < 2}
                onPress={() => cameraRef.current?.click()}
              >
                <Camera className="w-5 h-5" />
                {t("bar.camera")}
              </Button>
            )
          )}

          <Button
            variant="ghost"
            size="lg"
            className="w-full text-foreground/60"
            isDisabled={barName.trim().length < 2 || creating}
            onPress={() => createSession([])}
          >
            {t("bar.skipManual")}
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
      </div>
    );
  }

  // === REVIEW STEP ===
  return (
    <div className="min-h-screen p-6 pb-24">
      <h2 className="text-xl font-bold mb-4">{t("review.title")}</h2>

      {menuItems.length > 0 && (
        <div className="space-y-1 mb-6">
          {menuItems.map((item, idx) => (
            <Card key={idx}>
              <div className="px-3 py-2 flex items-center gap-2">
                <Chip size="sm">
                  <CategoryIcon category={item.category} className="w-4 h-4" />
                </Chip>
                <input
                  type="text"
                  value={item.name}
                  onChange={(event) => editItem(idx, event.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground"
                  aria-label={t("review.editDrink", { name: item.name })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => removeItem(idx)}
                  aria-label={t("review.removeDrink", { name: item.name })}
                >
                  ×
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-default-500 text-sm mb-6">{t("review.hint")}</p>

      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 pb-[env(safe-area-inset-bottom)]">
        <Button
          variant="primary"
          size="lg"
          className="gap-1"
          isDisabled={creating}
          onPress={() => createSession()}
        >
          <Beer className="w-5 h-5" />
          {creating ? t("bar.creating") : t("review.startCounting")}
        </Button>
      </div>
    </div>
  );
}
