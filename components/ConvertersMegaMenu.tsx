"use client";

import { KeyboardEvent, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Box,
  Braces,
  Combine,
  FileArchive,
  FileImage,
  FileScan,
  FileText,
  FileType,
  ImageDown,
  Layers3,
  LucideIcon,
  Maximize2,
  Music,
  PanelTop,
  Presentation,
  Sheet,
  Video,
} from "lucide-react";
import {
  converterToolSections,
  getToolsBySection,
  ConverterTool,
} from "@/lib/tools/converterTools";

const iconMap: Record<string, LucideIcon> = {
  archive: FileArchive,
  "archive-extract": ArchiveRestore,
  "archive-plus": Archive,
  audio: Music,
  cad: Box,
  compress: Maximize2,
  "compress-image": ImageDown,
  document: FileText,
  ebook: BookOpen,
  font: FileType,
  image: FileImage,
  merge: Combine,
  ocr: FileScan,
  presentation: Presentation,
  screenshot: PanelTop,
  spreadsheet: Sheet,
  vector: Braces,
  video: Video,
  "website-pdf": Layers3,
};

export function ConverterToolIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] ?? FileText;
  return <Icon className={className} />;
}

function isActiveTool(route: string, activeRoute: string) {
  return activeRoute === route || activeRoute.startsWith(`${route}/`);
}

function focusMenuItem(event: KeyboardEvent, offset: number) {
  const panel = event.currentTarget.closest("[data-converters-menu]");
  const items = Array.from(
    panel?.querySelectorAll<HTMLAnchorElement>("[data-tool-link]") ?? [],
  );
  const currentIndex = items.indexOf(event.currentTarget as HTMLAnchorElement);

  if (currentIndex < 0 || items.length === 0) {
    return;
  }

  event.preventDefault();
  const nextIndex = (currentIndex + offset + items.length) % items.length;
  items[nextIndex]?.focus();
}

function handleToolKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    focusMenuItem(event, 1);
  }

  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    focusMenuItem(event, -1);
  }
}

export function ConvertersMegaMenu({
  activeRoute,
  onSelect,
}: {
  activeRoute: string;
  onSelect: () => void;
}) {
  const convertFileTools = getToolsBySection("Convert files");
  const convertFileToolColumns = [
    convertFileTools.filter((_, index) => index < 6),
    convertFileTools.filter((_, index) => index >= 6),
  ];
  const optimizeFileTools = getToolsBySection("Optimize files");
  const pdfTools = getToolsBySection("PDF tools");
  const archiveTools = getToolsBySection("Archive tools");
  const websiteTools = getToolsBySection("Website tools");

  return (
    <div
      id="converters-menu"
      data-converters-menu
      className="grid max-h-[calc(100svh-5.5rem)] w-full gap-3 overflow-y-auto overscroll-contain rounded-[1.5rem] border bg-[var(--card)] p-4 shadow-[0_14px_34px_rgba(24,37,28,0.10)] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]"
    >
      <section className="min-w-0">
        <SectionTitle title="Convert files" />
        <div className="grid gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
          {convertFileToolColumns.map((columnTools, columnIndex) => (
            <div key={columnIndex} className="grid gap-1.5">
              {columnTools.map((tool) => (
                <ConverterToolLink
                  key={tool.id}
                  tool={tool}
                  active={isActiveTool(tool.route, activeRoute)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className="grid min-w-0 content-start gap-3">
        <section className="min-w-0">
          <SectionTitle title="Optimize files" />
          <div className="grid gap-1.5">
            {optimizeFileTools.map((tool) => (
              <ConverterToolLink
                key={tool.id}
                tool={tool}
                active={isActiveTool(tool.route, activeRoute)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>

        <section className="min-w-0">
          <SectionTitle title="PDF tools" />
          <div className="grid gap-1.5">
            {pdfTools.map((tool) => (
              <ConverterToolLink
                key={tool.id}
                tool={tool}
                active={isActiveTool(tool.route, activeRoute)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="grid min-w-0 content-start gap-3">
        <section className="min-w-0">
          <SectionTitle title="Archive tools" />
          <div className="grid gap-1.5">
            {archiveTools.map((tool) => (
              <ConverterToolLink
                key={tool.id}
                tool={tool}
                active={isActiveTool(tool.route, activeRoute)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>

        <section className="min-w-0">
          <SectionTitle title="Website tools" />
          <div className="grid gap-1.5">
            {websiteTools.map((tool) => (
              <ConverterToolLink
                key={tool.id}
                tool={tool}
                active={isActiveTool(tool.route, activeRoute)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-1.5 border-b border-[var(--border)]/70 px-1 pb-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
        {title}
      </p>
    </div>
  );
}

function ConverterToolLink({
  tool,
  active,
  onSelect,
}: {
  tool: ConverterTool;
  active: boolean;
  onSelect: () => void;
}) {
  const isComingSoon = tool.status === "coming-soon";
  const statusBadge = isComingSoon ? <ToolStatusBadge /> : null;
  const rowClassName = `grid min-h-[40px] items-center gap-2 rounded-[0.8rem] px-2.5 py-1.5 transition ${
    statusBadge ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)]"
  } ${
    isComingSoon
      ? "cursor-not-allowed text-[var(--muted-foreground)] opacity-72"
      : active
        ? "bg-[color:color-mix(in_srgb,var(--background-secondary)_88%,var(--card))] text-[var(--primary-dark)] dark:text-[var(--foreground)]"
        : "text-[var(--foreground)] hover:bg-[var(--card-muted)]"
  }`;
  const iconClassName = `inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
    isComingSoon
      ? "bg-[var(--card-muted)] text-[var(--muted-foreground)]"
      : active
        ? "bg-[var(--card)] text-[var(--primary)]"
        : "bg-[var(--background-secondary)]/80 text-[var(--primary-soft)]"
  }`;
  const labelClassName = `min-w-0 pr-1 text-[13px] font-semibold leading-5 ${
    isComingSoon
      ? "text-[var(--muted-foreground)] md:whitespace-nowrap"
      : "text-[var(--foreground)] md:whitespace-nowrap"
  }`;

  if (isComingSoon) {
    return (
      <div
        aria-disabled="true"
        className="rounded-[0.95rem] p-0.5"
      >
        <span className={rowClassName}>
          <span className={iconClassName}>
            <ConverterToolIcon icon={tool.icon} className="h-3.5 w-3.5" />
          </span>
          <span className={labelClassName}>{tool.name}</span>
          {statusBadge}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={tool.route as Route}
      data-tool-link
      onClick={onSelect}
      onKeyDown={handleToolKeyDown}
      className="rounded-[0.95rem] p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      <span className={rowClassName}>
        <span className={iconClassName}>
          <ConverterToolIcon icon={tool.icon} className="h-3.5 w-3.5" />
        </span>
        <span className={labelClassName}>{tool.name}</span>
      </span>
    </Link>
  );
}

function ToolStatusBadge() {
  return (
    <span className="inline-flex h-5 shrink-0 whitespace-nowrap items-center justify-center self-center rounded-full border border-[var(--primary)]/18 bg-[var(--background-secondary)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
      Soon
    </span>
  );
}

export function MobileConvertersMenu({
  activeRoute,
  onSelect,
}: {
  activeRoute: string;
  onSelect: () => void;
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(["Convert files"]),
  );

  function toggleSection(section: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-2">
      {converterToolSections.map((section) => {
        const isOpen = openSections.has(section);

        return (
          <section key={section} className="rounded-2xl border bg-[var(--card)]">
            <button
              type="button"
              onClick={() => toggleSection(section)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)]"
            >
              {section}
              <span className="text-xs text-[var(--muted-foreground)]">
                {isOpen ? "Hide" : "Show"}
              </span>
            </button>
            <div className={`${isOpen ? "grid" : "hidden"} gap-1 border-t p-2`}>
              {getToolsBySection(section).map((tool) => {
                const isComingSoon = tool.status === "coming-soon";
                const mobileRowClassName = `grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isComingSoon
                    ? "cursor-not-allowed text-[var(--muted-foreground)] opacity-72"
                    : isActiveTool(tool.route, activeRoute)
                      ? "bg-[var(--background-secondary)] text-[var(--primary-dark)] dark:text-[var(--foreground)]"
                      : "text-[var(--foreground)] hover:bg-[var(--card-muted)]"
                }`;

                if (isComingSoon) {
                  return (
                    <div
                      key={tool.id}
                      aria-disabled="true"
                      className={mobileRowClassName}
                    >
                      <ConverterToolIcon icon={tool.icon} className="h-4 w-4 text-[var(--muted-foreground)]" />
                      <span className="min-w-0 text-left leading-5">{tool.name}</span>
                      <ToolStatusBadge />
                    </div>
                  );
                }

                return (
                  <Link
                    key={tool.id}
                    href={tool.route as Route}
                    onClick={onSelect}
                    className={mobileRowClassName}
                  >
                    <ConverterToolIcon icon={tool.icon} className="h-4 w-4 text-[var(--primary)]" />
                    <span className="min-w-0 text-left leading-5">{tool.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
