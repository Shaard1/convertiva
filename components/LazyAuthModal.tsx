"use client";

import dynamic from "next/dynamic";

type LazyAuthModalProps = {
  isOpen: boolean;
  mode: "login" | "signup";
  onClose: () => void;
};

const AuthModal = dynamic(
  () => import("@/components/AuthModal").then((module) => module.AuthModal),
  {
    ssr: false,
    loading: () => (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
        role="status"
        aria-live="polite"
      >
        <div className="rounded-full bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-lg">
          Loading sign in…
        </div>
      </div>
    ),
  },
);

export function LazyAuthModal(props: LazyAuthModalProps) {
  return <AuthModal {...props} />;
}
