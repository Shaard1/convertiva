"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Upload } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { ConverterToolIcon } from "@/components/ConvertersMegaMenu";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SectionHeading } from "@/components/SectionHeading";
import { useAppShellState } from "@/hooks/useAppShellState";
import { getToolById } from "@/lib/tools/converterTools";

type ToolPlaceholderPageProps = {
  toolId: string;
};

const plannedSteps = [
  {
    icon: "upload",
    title: "Upload your file",
    text: "Choose one file or drop it into the upload area.",
  },
  {
    icon: "settings",
    title: "Choose settings",
    text: "Pick the output format and adjust simple options when needed.",
  },
  {
    icon: "download",
    title: "Convert and download",
    text: "Run the conversion and download the finished file when ready.",
  },
];

export function ToolPlaceholderPage({ toolId }: ToolPlaceholderPageProps) {
  const tool = useMemo(() => getToolById(toolId), [toolId]);
  const {
    authModalOpen,
    authMode,
    closeAuth,
    handleLogout,
    openAuth,
    usage,
    user,
  } = useAppShellState();

  if (!tool) {
    return null;
  }

  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <Navbar user={user} usage={usage} onOpenAuth={openAuth} onLogout={handleLogout} />

      <main>
        <section className="relative px-4 pb-14 pt-10 sm:px-6 sm:pb-18 sm:pt-14">
          <div className="mx-auto max-w-4xl">
            <div className="card-shadow rounded-[1.5rem] border bg-[var(--card)] p-4 sm:p-6 lg:p-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
                <ConverterToolIcon icon={tool.icon} className="h-4 w-4" />
                Convertiva Tools
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                {tool.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {tool.subtitle}
              </p>

              <div className="mt-7 rounded-[1.5rem] border border-dashed border-[var(--primary-soft)] bg-[var(--card-muted)] p-6 text-center">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--primary)] shadow-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                  Coming soon
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
                  The page is ready, and conversion logic will be added when this tool moves from coming soon to ready.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--primary-dark)] transition hover:border-[var(--primary)] hover:bg-[var(--background-secondary)] dark:text-[var(--foreground)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to converters
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="formats" className="soft-section section-fade py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-6">
            <SectionHeading
              badge="Formats"
              title={`${tool.title} formats`}
              description="These are the format groups planned for this tool."
            />
            <div className="mx-auto mt-10 rounded-[1.5rem] border bg-[var(--card)] p-5 sm:p-7">
              <div className="flex flex-wrap gap-2.5">
                {tool.formats.map((format) => (
                  <span
                    key={format}
                    className="rounded-xl border border-[var(--primary)]/18 bg-[color-mix(in_srgb,var(--background-secondary)_72%,var(--card))] px-4 py-3 text-sm font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-fade py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              badge="How it works"
              title="A simple flow is planned"
              description="The final tool will follow the same clear Convertiva pattern."
            />
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plannedSteps.map((step, index) => {
                return (
                  <div key={step.title} className="rounded-[1.5rem] border bg-[var(--card)] p-6">
                    <div className="flex items-center gap-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--background-secondary)] text-base font-semibold text-[var(--primary)]">
                        {index + 1}
                      </div>
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[var(--card-muted)] text-[var(--primary)]">
                        {step.icon === "upload" ? <Upload className="h-5 w-5" /> : null}
                        {step.icon === "settings" ? <CheckCircle2 className="h-5 w-5" /> : null}
                        {step.icon === "download" ? (
                          <ConverterToolIcon icon={tool.icon} className="h-5 w-5" />
                        ) : null}
                      </div>
                    </div>
                    <h3 className="mt-6 text-lg font-semibold text-[var(--foreground)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                      {step.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <AuthModal isOpen={authModalOpen} mode={authMode} onClose={closeAuth} />
    </div>
  );
}

