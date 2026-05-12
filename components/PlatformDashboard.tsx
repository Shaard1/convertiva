"use client";

import { useEffect, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { signOutUser } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getAuthenticatedUsage, getGuestUsage } from "@/lib/usage";
import { AuthUser } from "@/types/auth";
import { UserUsage } from "@/types/usage";

const formatGroups = [
  { label: "Images", count: "10+", formats: ["PNG", "JPG", "WEBP", "AVIF", "TIFF"] },
  { label: "Video", count: "25+", formats: ["MP4", "MOV", "MKV", "WEBM", "AVI"] },
  { label: "Documents", count: "20+", formats: ["PDF", "DOCX", "TXT", "RTF", "ODT"] },
  { label: "Audio", count: "20+", formats: ["MP3", "WAV", "M4A", "FLAC", "AAC"] },
];

function mapSupabaseUser(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
  };
}

export function PlatformDashboard() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);

  useEffect(() => {
    const guestUsage = getGuestUsage();
    setUsage(guestUsage);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      const authUser = mapSupabaseUser(data.session);
      setUser(authUser);
      if (authUser) {
        getAuthenticatedUsage(authUser)
          .then(setUsage)
          .catch(() => setUsage(guestUsage));
      }
    });

    const listener = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session) => {
        const authUser = mapSupabaseUser(session);
        setUser(authUser);
        if (!authUser) {
          setUsage(getGuestUsage());
          return;
        }

        try {
          setUsage(await getAuthenticatedUsage(authUser));
        } catch {
          setUsage(guestUsage);
        }
      },
    );

    return () => {
      isMounted = false;
      listener.data.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await signOutUser();
    setUser(null);
    setUsage(getGuestUsage());
  }

  function openAuth(mode: "login" | "signup") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <Navbar user={user} usage={usage} onOpenAuth={openAuth} onLogout={handleLogout} />

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:pb-20 lg:pt-16">
          <div className="mx-auto flex max-w-5xl justify-center">
            <div className="section-fade text-center">
              <span className="inline-flex items-center gap-2 rounded-full border bg-[color-mix(in_srgb,var(--card)_82%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]">
                <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                One calm place for file conversion
              </span>
              <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Convert files without jumping between tools.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
                Choose a converter, upload your file, and get a cleaner output flow for images, videos, documents, and audio.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="/tools/image-converter"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3E5F44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
                >
                  Start converting
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#formats"
                  className="inline-flex items-center justify-center rounded-full border bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:border-[var(--primary)] hover:bg-[var(--background-secondary)] dark:text-[var(--foreground)]"
                >
                  Browse converters
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="formats" className="soft-section px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="rounded-[1.75rem] border bg-[var(--card)] p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--background-secondary)] text-[var(--primary)]">
                  <Layers3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                    Formats supported
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                    Everyday formats, grouped by task.
                  </h2>
                </div>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {formatGroups.map((group) => (
                  <div key={group.label} className="rounded-2xl border bg-[var(--card-muted)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{group.label}</p>
                      <span className="rounded-full bg-[var(--background-secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]">
                        {group.count}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.formats.map((format) => (
                        <span
                          key={format}
                          className="rounded-lg border bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]"
                        >
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <FeatureCard
                icon={ShieldCheck}
                title="Files stay temporary"
                text="Conversions are designed around short-lived processing, clear limits, and no unnecessary clutter."
              />
              <FeatureCard
                icon={SlidersHorizontal}
                title="Options when needed"
                text="Tune size, quality, bitrate, trim settings, and other details without overwhelming the main flow."
              />
              <FeatureCard
                icon={LockKeyhole}
                title="Built for accounts"
                text="Guest users can start quickly. Signed-in users get higher daily limits and conversion history where supported."
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl rounded-[1.75rem] border bg-[var(--card)] p-6 text-center sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Three steps, no busy dashboard.
            </h2>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {["Choose a converter", "Upload one file", "Pick an output format"].map((step, index) => (
                <div key={step} className="rounded-2xl border bg-[var(--card-muted)] p-5 text-left">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--background-secondary)] text-sm font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]">
                    {index + 1}
                  </span>
                  <p className="mt-4 font-semibold text-[var(--foreground)]">{step}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    Keep the flow focused and easy to understand from start to finish.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <AuthModal isOpen={authModalOpen} mode={authMode} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] border bg-[var(--card)] p-5">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--background-secondary)] text-[var(--primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{text}</p>
    </div>
  );
}
