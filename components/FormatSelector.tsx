"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { SUPPORTED_OUTPUT_FORMATS } from "@/lib/constants";
import { OutputFormat } from "@/types/converter";

type FormatSelectorProps = {
  value: OutputFormat;
  onChange: (value: OutputFormat) => void;
};

const documentFormats: OutputFormat[] = ["pdf"];
const imageFormats = SUPPORTED_OUTPUT_FORMATS.filter(
  (format) => !documentFormats.includes(format),
);

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"document" | "image">(
    "image",
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  const filteredImageFormats = useMemo(
    () => filterFormats(imageFormats, query),
    [query],
  );
  const filteredDocumentFormats = useMemo(
    () => filterFormats(documentFormats, query),
    [query],
  );

  function selectFormat(format: OutputFormat) {
    onChange(format);
    setIsOpen(false);
    setQuery("");
  }

  function toggleMenu() {
    setIsOpen((current) => {
      if (!current) {
        setActiveCategory("image");
      }
      return !current;
    });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="w-full lg:max-w-[30rem]">
      <label
        id="output-format-label"
        className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
      >
        Convert to
      </label>

      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-labelledby="output-format-label"
          onClick={toggleMenu}
          className={`flex min-h-[48px] w-full items-center justify-between border bg-[var(--card)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] ${
            isOpen ? "rounded-t-2xl rounded-b-none border-[var(--primary)]" : "rounded-2xl"
          }`}
        >
          <span className="uppercase">{value}</span>
          <ChevronDown
            className={`h-4 w-4 text-[var(--muted-foreground)] transition-transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        <div
          className={`absolute left-0 top-full z-40 w-full overflow-hidden rounded-b-2xl border border-[var(--primary)] border-t-0 bg-[var(--card)] shadow-xl transition-all duration-180 ease-out ${
            isOpen
              ? "visible translate-y-0 opacity-100"
              : "pointer-events-none invisible -translate-y-1 opacity-0"
          }`}
        >
          <div className="border-b border-[var(--border)] px-3 py-2">
            <div className="group flex h-9 items-center gap-2 rounded-md border border-transparent bg-transparent px-2 transition-colors duration-150 ease-out hover:bg-[var(--card-muted)] focus-within:border-[var(--border)] focus-within:bg-[var(--card-muted)]">
              <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-colors duration-150 ease-out group-focus-within:text-[var(--foreground)]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search format"
                className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm text-[var(--foreground)] caret-[var(--primary)] !outline-none placeholder:text-[var(--muted-foreground)] focus:!outline-none focus-visible:!outline-none focus-visible:outline-offset-0 focus-visible:!shadow-none"
              />
            </div>
          </div>

          <div className="grid min-h-48 grid-cols-1 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <div className="grid grid-cols-2 border-b bg-[var(--card-muted)] py-2 text-sm sm:block sm:border-b-0 sm:border-r">
              <button
                type="button"
                onClick={() => setActiveCategory("document")}
                className={`block w-full px-3 py-1.5 text-left font-semibold transition ${
                  activeCategory === "document"
                    ? "bg-[var(--background-secondary)] text-[var(--foreground)]"
                    : "text-[var(--foreground)] hover:bg-[var(--background-secondary)]"
                }`}
              >
                Document
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("image")}
                className={`block w-full px-3 py-1.5 text-left font-semibold transition ${
                  activeCategory === "image"
                    ? "bg-[var(--background-secondary)] text-[var(--foreground)]"
                    : "text-[var(--foreground)] hover:bg-[var(--background-secondary)]"
                }`}
              >
                Image
              </button>
            </div>

            <div className="space-y-3 p-3">
              {activeCategory === "document" && filteredDocumentFormats.length ? (
                <FormatGrid
                  label="Document formats"
                  formats={filteredDocumentFormats}
                  value={value}
                  onSelect={selectFormat}
                />
              ) : null}

              {activeCategory === "image" && filteredImageFormats.length ? (
                <FormatGrid
                  label="Image formats"
                  formats={filteredImageFormats}
                  value={value}
                  onSelect={selectFormat}
                />
              ) : null}

              {activeCategory === "document" && !filteredDocumentFormats.length ? (
                <p className="rounded-xl border bg-[var(--card-muted)] px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">
                  No matching format.
                </p>
              ) : null}

              {activeCategory === "image" && !filteredImageFormats.length ? (
                <p className="rounded-xl border bg-[var(--card-muted)] px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">
                  No matching format.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function filterFormats(formats: OutputFormat[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return formats;
  }

  return formats.filter((format) => format.toLowerCase().includes(normalizedQuery));
}

function FormatGrid({
  label,
  formats,
  value,
  onSelect,
}: {
  label: string;
  formats: OutputFormat[];
  value: OutputFormat;
  onSelect: (format: OutputFormat) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="output-format-label"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {formats.map((format) => {
          const isSelected = format === value;

          return (
            <button
              key={format}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(format)}
              className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold uppercase transition ${
                isSelected
                  ? "border-[var(--primary)] bg-[var(--background-secondary)] text-[var(--primary-dark)] shadow-sm dark:text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--card-muted)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--background-secondary)]"
              }`}
            >
              {format.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
