"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, AudioLines, FileImage, FileText, Film, Merge, ScanLine, Sparkles } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useAppShellState } from "@/hooks/useAppShellState";
import { converterTools } from "@/lib/tools/converterTools";

const featuredIds = ["image-converter", "video-converter", "audio-converter", "document-converter", "compress-jpg", "merge-pdf"];
const featureIcons = [FileImage, Film, AudioLines, FileText, ScanLine, Merge];

export function PlatformDashboard() {
  const { authModalOpen, authMode, closeAuth, handleLogout, openAuth, usage, user } = useAppShellState();
  const featured = featuredIds.map((id) => converterTools.find((tool) => tool.id === id)).filter(Boolean);
  const readyCount = converterTools.filter((tool) => tool.status === "ready").length;

  return <div className="page-shell min-h-screen overflow-hidden text-[var(--foreground)]">
    <Navbar user={user} usage={usage} onOpenAuth={openAuth} onLogout={handleLogout} />
    <main id="main-content">
      <section className="hero-section px-4 pb-20 pt-12 sm:px-6 lg:pb-28 lg:pt-20"><div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-[1.05fr_.95fr]">
        <div className="section-fade"><p className="eyebrow"><Sparkles className="h-4 w-4" /> File tools, without the busywork</p><h1 className="hero-title mt-6 max-w-3xl">Move files forward.</h1><p className="hero-copy mt-6 max-w-xl">Convert, compress, and organize everyday files in one calm, capable workspace.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/tools/image-converter" className="button-primary">Start converting <ArrowUpRight className="h-4 w-4" /></Link><a href="#tools" className="button-secondary">Explore tools</a></div><div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[var(--muted-foreground)]"><span><strong className="text-[var(--foreground)]">{readyCount}</strong> tools ready</span><span>Temporary processing</span><span>No clutter</span></div></div>
        <div className="hero-workspace section-fade" style={{ animationDelay: "120ms" }}><div className="workspace-top"><span className="status-dot" /> Convertiva workspace <span className="ml-auto text-xs text-[var(--muted-foreground)]">ready</span></div><div className="workspace-file"><div className="file-icon"><FileImage className="h-6 w-6" /></div><div><p className="font-semibold">your-next-project.png</p><p className="text-xs text-[var(--muted-foreground)]">2.4 MB · ready to convert</p></div><span className="file-pill">PNG</span></div><div className="workspace-controls"><div><p className="text-xs uppercase tracking-[.16em] text-[var(--muted-foreground)]">Output format</p><p className="mt-2 font-semibold">WEBP <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">smaller, web-ready</span></p></div><Link href="/tools/image-converter" className="workspace-action">Open tool <ArrowUpRight className="h-4 w-4" /></Link></div></div>
      </div></section>
      <section id="tools" className="tools-section px-4 py-20 sm:px-6 lg:py-28"><div className="mx-auto max-w-7xl"><div className="section-intro"><div><p className="eyebrow">The toolkit</p><h2 className="section-title mt-4">Pick the job.<br className="hidden sm:block" /> We’ll handle the file.</h2></div><p className="max-w-sm text-base leading-7 text-[var(--muted-foreground)]">From a quick image conversion to a folder full of archives, the right tool is never far away.</p></div><div className="tool-grid mt-12">{featured.map((tool, index) => { if (!tool) return null; const Icon = featureIcons[index] ?? FileText; return <Link href={tool.route as Route} key={tool.id} className={`tool-card tool-card-${index + 1}`}><div className="tool-card-head"><span className="tool-icon"><Icon className="h-6 w-6" /></span><span className="tool-arrow"><ArrowUpRight className="h-5 w-5" /></span></div><div className="mt-auto"><p className="tool-kicker">{tool.formats.slice(0, 3).join(" · ")}</p><h3 className="mt-2 text-xl font-semibold">{tool.name}</h3><p className="mt-2 max-w-[27ch] text-sm leading-6 text-[var(--muted-foreground)]">{tool.subtitle}</p></div></Link>; })}</div><div className="mt-7 flex justify-end"><Link href="#formats" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)] transition hover:gap-3 dark:text-[var(--foreground)]">See all tools <ArrowUpRight className="h-4 w-4" /></Link></div></div></section>
    </main><Footer /><AuthModal isOpen={authModalOpen} mode={authMode} onClose={closeAuth} />
  </div>;
}
