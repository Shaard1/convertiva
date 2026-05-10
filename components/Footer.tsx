import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 text-sm text-[var(--muted-foreground)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">{APP_NAME}</p>
          <p className="mt-2 max-w-md">
            A simple image converter built for fast and clean file conversion.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <a href="#formats" className="transition hover:text-[var(--foreground)]">
            Formats
          </a>
          <a
            href="#how-it-works"
            className="transition hover:text-[var(--foreground)]"
          >
            How it works
          </a>
        </div>
        <p>(c) 2026 {APP_NAME}. All rights reserved.</p>
      </div>
    </footer>
  );
}
