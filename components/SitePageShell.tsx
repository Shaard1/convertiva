"use client";

import { ReactNode } from "react";
import { AuthModal } from "@/components/AuthModal";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useAppShellState } from "@/hooks/useAppShellState";

export function SitePageShell({ children }: { children: ReactNode }) {
  const { authModalOpen, authMode, closeAuth, handleLogout, openAuth, usage, user } = useAppShellState();

  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <Navbar user={user} usage={usage} onOpenAuth={openAuth} onLogout={handleLogout} />
      <main>{children}</main>
      <Footer />
      <AuthModal isOpen={authModalOpen} mode={authMode} onClose={closeAuth} />
    </div>
  );
}
