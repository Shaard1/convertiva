"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, FileImage, LogOut, Menu, Video, X } from "lucide-react";
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

const converterLinks = [
  { label: "Image Converter", href: "/tools/image-converter", icon: FileImage },
  { label: "Video Converter", href: "/tools/video-converter", icon: Video },
];

const navLinks = [
  { label: "Formats", href: "#formats" },
  { label: "How it works", href: "#how-it-works" },
];

const linkClass =
  "rounded-full px-3.5 py-2 text-sm font-semibold text-[var(--muted-foreground)] transition hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]";

const convertButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#3E5F44] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2F4A35]";
const loginButtonClass =
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background-secondary)]";
const signupButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--primary)]/35 bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-dark)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] dark:text-[var(--foreground)]";

export function Navbar({ user, usage, onOpenAuth, onLogout }: NavbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConvertersOpen, setIsConvertersOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const convertersRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!isConvertersOpen) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (!convertersRef.current?.contains(event.target as Node)) {
        setIsConvertersOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsConvertersOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isConvertersOpen]);

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
    setIsConvertersOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        hasScrolled
          ? "border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--background)_88%,transparent)] shadow-[0_10px_30px_rgba(24,37,28,0.08)] backdrop-blur-xl"
          : "border-b border-transparent bg-[color:color-mix(in_srgb,var(--background)_74%,transparent)] backdrop-blur-md"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[68px] items-center justify-between gap-3">
          <a
            href="/tools/image-converter"
            onClick={closeMenu}
            className="flex min-w-0 items-center gap-3 rounded-full pr-2 transition"
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
              <span className="mt-0.5 hidden text-[11px] font-medium text-[#6F786F] dark:text-[var(--muted-foreground)] sm:block">
                Easy image conversion
              </span>
            </span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-full border bg-[color-mix(in_srgb,var(--card)_86%,transparent)] px-1.5 py-1 lg:flex"
          >
            <div ref={convertersRef} className="relative">
              <button
                type="button"
                onClick={() => setIsConvertersOpen((current) => !current)}
                aria-expanded={isConvertersOpen}
                className={`${linkClass} inline-flex items-center gap-1.5`}
              >
                Converters
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isConvertersOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
              <div
                className={`absolute left-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border bg-[var(--card)] p-1 shadow-xl transition-all duration-180 ease-out ${
                  isConvertersOpen
                    ? "visible translate-y-0 opacity-100"
                    : "pointer-events-none invisible -translate-y-1 opacity-0"
                }`}
              >
                {converterLinks.map((link) => {
                  const Icon = link.icon;

                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background-secondary)]"
                    >
                      <Icon className="h-4 w-4 text-[var(--primary)]" />
                      {link.label}
                    </a>
                  );
                })}
              </div>
            </div>
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <div className="hidden min-[1180px]:block">
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
                {isLoggingOut ? "Logging out..." : "Log out"}
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--card)] text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] lg:hidden"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height,opacity,padding] duration-300 lg:hidden ${
            isMenuOpen ? "max-h-[520px] pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"
          }`}
        >
          <div className="rounded-[1.25rem] border bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-3 shadow-[0_16px_40px_rgba(24,37,28,0.08)]">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[var(--card-muted)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Menu
              </span>
              <UsageBadge usage={usage} />
            </div>
            <nav aria-label="Mobile navigation" className="grid gap-1">
              {converterLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background-secondary)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--primary)]" />
                    {link.label}
                  </a>
                );
              })}
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background-secondary)]"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="mt-3 grid gap-3 border-t pt-3">
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
                  {isLoggingOut ? "Logging out..." : "Log out"}
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
