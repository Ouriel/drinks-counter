"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/react";

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();

  // resolvedTheme is undefined during SSR/hydration — render neutral until mounted
  const icon = resolvedTheme === "dark" ? "☀️" : resolvedTheme === "light" ? "🌙" : "◐";

  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {icon}
    </Button>
  );
}
