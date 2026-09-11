import type { ReactNode } from "react";
import { AppShellHeader } from "@/components/AppShellHeader";
import { Footer } from "@/components/Footer";

export function SitePageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <AppShellHeader />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
