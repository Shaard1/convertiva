"use client";

import { LazyAuthModal } from "@/components/LazyAuthModal";
import { Navbar } from "@/components/Navbar";
import { useAppShellState } from "@/hooks/useAppShellState";

export function AppShellHeader() {
  const { authModalOpen, authMode, closeAuth, handleLogout, openAuth, usage, user } =
    useAppShellState();

  return (
    <>
      <Navbar
        user={user}
        usage={usage}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
      />
      {authModalOpen ? (
        <LazyAuthModal isOpen mode={authMode} onClose={closeAuth} />
      ) : null}
    </>
  );
}
