"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import styles from "./FormatPicker.module.css";

type Category<T extends string> = { label: string; formats: readonly T[] };

export function FormatPicker<T extends string>({ categories, value, onChange }: {
  categories: readonly Category<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryIndex, setCategoryIndex] = useState(0);
  const category = categories[categoryIndex];
  const formats = category.formats.filter((format) => format.toLowerCase().includes(query.trim().toLowerCase()));

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    function outside(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  return (
    <div ref={root} className={styles.root} onKeyDown={(event) => {
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <p id={`${id}-label`} className={styles.label}>Convert to</p>
      <button ref={trigger} type="button" aria-labelledby={`${id}-label`} aria-expanded={open} aria-controls={`${id}-panel`} aria-haspopup="dialog" className={styles.trigger} onClick={() => setOpen(!open)}>
        <span>{value ? value.toUpperCase() : "Choose format"}</span><ChevronDown className={styles.chevron} data-open={open} size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div id={`${id}-panel`} role="dialog" aria-label="Choose output format" className={styles.panel}>
          <label className={styles.search}><Search size={16} aria-hidden="true" /><span className="sr-only">Search format</span><input ref={search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search format" /></label>
          <div className={styles.categories} aria-label="Format categories">
            {categories.map((item, index) => <button type="button" key={item.label} aria-pressed={categoryIndex === index} onClick={() => setCategoryIndex(index)}>{item.label}</button>)}
          </div>
          <p className={styles.label}>{category.label} formats</p>
          <div className={styles.options} role="group" aria-label={`${category.label} formats`}>
            {formats.map((format) => <button type="button" key={format} aria-pressed={format === value} onClick={() => { onChange(format); setQuery(""); close(); }}>{format.toUpperCase()}</button>)}
          </div>
          {!formats.length ? <p role="status" className={styles.empty}>No matching format.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
