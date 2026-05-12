"use client";

import {
  ArrowRight,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useAppShellState } from "@/hooks/useAppShellState";
import {
  converterToolSections,
  getToolsBySection,
} from "@/lib/tools/converterTools";

export function PlatformDashboard() {
  const {
    authModalOpen,
    authMode,
    closeAuth,
    handleLogout,
    openAuth,
    usage,
    user,
  } = useAppShellState();

  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <Navbar user={user} usage={usage} onOpenAuth={openAuth} onLogout={handleLogout} />

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:pb-20 lg:pt-16">
          <div className="mx-auto flex max-w-5xl justify-center">
            <div className="section-fade text-center">
              <span className="inline-flex items-center gap-2 rounded-full border bg-[color-mix(in_srgb,var(--card)_82%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]">
                <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                Convertly keeps file conversion simple
              </span>
              <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Convertly gives every file a cleaner path.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
                Choose the right Convertly tool, upload your file, and move through image, video, document, audio, and utility tasks without a messy workflow.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/tools/image-converter"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3E5F44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
                >
                  Start converting
                  <ArrowRight className="h-4 w-4" />
                </Link>
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
                    Convertly tools
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                    Formats and tools, grouped by task.
                  </h2>
                </div>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {converterToolSections.map((section) => {
                  const tools = getToolsBySection(section);

                  return (
                  <div key={section} className="rounded-2xl border bg-[var(--card-muted)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{section}</p>
                      <span className="rounded-full bg-[var(--background-secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]">
                        {tools.length}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tools.map((tool) => (
                        <span
                          key={tool.id}
                          className="rounded-lg border bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]"
                        >
                          {tool.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4">
              <FeatureCard
                icon={ShieldCheck}
                title="Files stay temporary"
                text="Convertly keeps processing short-lived, limits clear, and the workflow focused on what you need."
              />
              <FeatureCard
                icon={SlidersHorizontal}
                title="Options when needed"
                text="Convertly adds size, quality, bitrate, trim, and other settings only where they help."
              />
              <FeatureCard
                icon={LockKeyhole}
                title="Built for accounts"
                text="Guests can start right away. Signed-in Convertly users get higher daily limits and extra room where supported."
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
              How Convertly keeps conversion simple.
            </h2>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {["Choose a Convertly tool", "Upload your file", "Pick the result you need"].map((step, index) => (
                <div key={step} className="rounded-2xl border bg-[var(--card-muted)] p-5 text-left">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--background-secondary)] text-sm font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]">
                    {index + 1}
                  </span>
                  <p className="mt-4 font-semibold text-[var(--foreground)]">{step}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    Convertly keeps the flow clear, friendly, and easy to follow from start to download.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <AuthModal isOpen={authModalOpen} mode={authMode} onClose={closeAuth} />
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
