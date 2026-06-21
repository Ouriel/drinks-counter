"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import { Sun, Moon, SunMoon } from "lucide-react";

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();

  // resolvedTheme is undefined during SSR/hydration — render neutral until mounted
  const Icon = resolvedTheme === "dark" ? Sun : resolvedTheme === "light" ? Moon : SunMoon;

  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Icon className="w-5 h-5" />
    </Button>
  );
}
