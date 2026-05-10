"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LogOut, Menu, X } from "lucide-react";
import { AuthUser } from "@/types/auth";
import { UserUsage } from "@/types/usage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UsageBadge } from "@/components/UsageBadge";

type NavbarProps = {
  user: AuthUser | null;
  usage: UserUsage | null;
  onOpenAuth: (mode: "login" | "signup") => void;
  onLogout: () => Promise<void>;
};

const navLinks = [
  { label: "Formats", href: "#formats" },
  { label: "Tools", href: "#converter" },
  { label: "How it works", href: "#how-it-works" },
];

const linkClass =
  "rounded-full px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";

// Button styles: Convert now is the visual anchor; auth actions stay quieter.
const convertButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#3E5F44] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2F4A35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E5F44]";
const loginButtonClass =
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";
const signupButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--primary)]/35 bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-dark)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] dark:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";

export function Navbar({ user, usage, onOpenAuth, onLogout }: NavbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const showAuthenticatedActions = Boolean(user) && !usage?.isGuest;

  // Sticky scroll effect: add a subtle border/shadow only after the page moves.
  useEffect(() => {
    function updateScrolledState() {
      setHasScrolled(window.scrollY > 8);
    }

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  async function handleLogout() {
    if (!showAuthenticatedActions) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await onLogout();
      setIsMenuOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  }

  function openAuthModal(mode: "login" | "signup") {
    setIsMenuOpen(false);
    onOpenAuth(mode);
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        hasScrolled
          ? "border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--background)_88%,transparent)] shadow-[0_10px_30px_rgba(24,37,28,0.08)] backdrop-blur-xl"
          : "border-b border-transparent bg-[color:color-mix(in_srgb,var(--background)_74%,transparent)] backdrop-blur-md"
      }`}
    >
      {/* Navbar spacing: match the hero width while keeping compact side gutters on small screens. */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[72px] items-center justify-between gap-3">
          <a
            href="#"
            onClick={closeMenu}
            className="flex min-w-0 items-center gap-3 rounded-full pr-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            aria-label="Convertly Image home"
          >
            <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border)] sm:h-11 sm:w-11">
              <Image
                src="/brand/logo.png"
                alt="Convertly Image logo"
                width={44}
                height={44}
                className="h-full w-full object-cover"
                priority
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[17px] font-semibold text-[#263128] dark:text-[var(--foreground)] sm:text-[18px]">
                Convertly Image
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-[#6F786F] dark:text-[var(--muted-foreground)] lg:block">
                by Jaiidonee
              </span>
            </span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-full border bg-[color-mix(in_srgb,var(--card)_86%,transparent)] px-1.5 py-1 lg:flex"
          >
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <div className="hidden xl:block">
              <UsageBadge usage={usage} />
            </div>
            <ThemeToggle />
            <a href="#converter" className={`${convertButtonClass} hidden md:inline-flex`}>
              Convert now
            </a>
            {showAuthenticatedActions ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`${signupButtonClass} hidden lg:inline-flex disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            ) : (
              <div className="hidden items-center gap-1 lg:flex xl:gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className={loginButtonClass}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("signup")}
                  className={signupButtonClass}
                >
                  Sign up
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMenuOpen}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--card)] text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] lg:hidden"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu: center links and auth actions move here to prevent overflow. */}
        <div
          className={`overflow-hidden transition-[max-height,opacity,padding] duration-300 lg:hidden ${
            isMenuOpen ? "max-h-[520px] pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"
          }`}
        >
          <div className="rounded-[1.5rem] border bg-[color-mix(in_srgb,var(--card)_94%,transparent)] p-3 shadow-[0_16px_40px_rgba(24,37,28,0.08)]">
            <nav aria-label="Mobile navigation" className="grid gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="mt-3 grid gap-3 border-t pt-3">
              <UsageBadge usage={usage} />
              <a href="#converter" onClick={closeMenu} className={convertButtonClass}>
                Convert now
              </a>

              {showAuthenticatedActions ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`${signupButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal("login")}
                    className={loginButtonClass}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal("signup")}
                    className={signupButtonClass}
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
