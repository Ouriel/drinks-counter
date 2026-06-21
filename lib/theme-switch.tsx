"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { Sun, Moon, SunMoon } from "lucide-react";
import { useIsHydrated } from "@/lib/use-is-hydrated";

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useIsHydrated();
  const t = useTranslations("common");

  // resolvedTheme is undefined on the server but resolved on the client's first render, so
  // render the neutral icon until hydrated to keep server and client markup identical.
  const Icon = !hydrated ? SunMoon : resolvedTheme === "dark" ? Sun : Moon;

  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={t("toggleTheme")}
    >
      <Icon className="w-5 h-5" />
    </Button>
  );
}
