"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium } from "lucide-react";
import { THEME_STORAGE_KEY } from "@/lib/constants";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const currentTheme =
      theme ?? (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-[color:color-mix(in_srgb,var(--card)_88%,transparent)] text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
    >
      {theme === null ? null : theme === "dark" ? (
        <SunMedium className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
