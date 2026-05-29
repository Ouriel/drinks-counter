"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const FLAGS: Record<string, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  es: "🇪🇸",
  ca: "🇪🇸",
  it: "🇮🇹",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      value={locale}
      onChange={(event) => {
        router.replace(pathname, { locale: event.target.value });
      }}
      className="bg-transparent text-sm border border-border rounded px-1 py-0.5 outline-none cursor-pointer"
      aria-label="Language"
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {FLAGS[loc] || "🌐"} {loc.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
