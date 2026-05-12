"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, mounted, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-[color:color-mix(in_srgb,var(--card)_88%,transparent)] text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
    >
      {!mounted ? null : theme === "dark" ? (
        <SunMedium className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
