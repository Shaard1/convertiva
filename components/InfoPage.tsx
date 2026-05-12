"use client";

import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useAppShellState } from "@/hooks/useAppShellState";

type InfoPageProps = {
  badge: string;
  title: string;
  description: string;
  sections: {
    title: string;
    body: string;
  }[];
};

export function InfoPage({ badge, title, description, sections }: InfoPageProps) {
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
        <section className="px-4 pb-14 pt-10 sm:px-6 sm:pb-18 sm:pt-14">
          <div className="mx-auto max-w-4xl">
            <div className="card-shadow rounded-[1.75rem] border bg-[var(--card)] p-6 sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
                <FileText className="h-4 w-4" />
                {badge}
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
                {description}
              </p>
              <div className="mt-6">
                <Link
                  href="/tools/image-converter"
                  className="inline-flex items-center gap-2 rounded-full bg-[#3E5F44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
                >
                  Start converting
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="soft-section px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[1.5rem] border bg-[var(--card)] p-6">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <AuthModal isOpen={authModalOpen} mode={authMode} onClose={closeAuth} />
    </div>
  );
}
