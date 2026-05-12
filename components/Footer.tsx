import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { APP_NAME } from "@/lib/constants";

type FooterLink = {
  label: string;
  href: Route;
};

const converterLinks: FooterLink[] = [
  { label: "Image Converter", href: "/tools/image-converter" },
  { label: "Video Converter", href: "/tools/video-converter" },
  { label: "Audio Converter", href: "/tools/audio-converter" },
  { label: "Document Converter", href: "/tools/document-converter" },
  { label: "All converters", href: "/#formats" },
];

const resourceLinks: FooterLink[] = [
  { label: "Formats", href: "/#formats" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Help", href: "/help" },
];

const legalLinks: FooterLink[] = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

const linkClass =
  "text-sm text-[var(--muted-foreground)] transition hover:text-[var(--primary)]";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]/80 bg-[color:color-mix(in_srgb,var(--card)_78%,transparent)] backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-12">
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-2xl ring-1 ring-[var(--border)]/70">
                <Image
                  src="/brand/logo.png"
                  alt="Convertly logo"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </span>
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">{APP_NAME}</p>
                <p className="text-xs font-medium text-[var(--muted-foreground)]">
                  Cleaner file conversion
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
              A cleaner place for file conversion across images, video, audio, documents, and everyday tools.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              Files are processed temporarily and removed after expiration.
            </p>
          </div>

          <FooterColumn title="Converters" links={converterLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border)]/70 pt-5 text-sm text-[var(--muted-foreground)] md:flex-row md:items-center md:justify-between">
          <p className="text-center md:text-left">© 2026 {APP_NAME}. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 md:justify-end">
            <Link href="/privacy-policy" className={linkClass}>
              Privacy
            </Link>
            <Link href="/terms" className={linkClass}>
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">
        {title}
      </h2>
      <nav className="mt-4 grid gap-2.5" aria-label={title}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass}>
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
