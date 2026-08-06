"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Dark ⇄ light toggle.
 *
 * The `mounted` guard exists because the server cannot know what is in
 * localStorage: rendering the resolved theme's icon before hydration is a
 * guaranteed mismatch. The button is rendered either way, at full size, so the
 * swap costs no layout shift — only the icon waits.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme !== "light";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? `Switch to ${isDark ? "light" : "dark"} theme`
          : "Switch theme"
      }
      data-testid="theme-toggle"
      data-theme-state={mounted ? (isDark ? "dark" : "light") : "unknown"}
    >
      {mounted ? (
        isDark ? (
          <Sun aria-hidden="true" />
        ) : (
          <Moon aria-hidden="true" />
        )
      ) : null}
    </Button>
  );
}
