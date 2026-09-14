"use client";

import { FormatPicker } from "@/components/FormatPicker";
import { SUPPORTED_OUTPUT_FORMATS } from "@/lib/constants";
import type { OutputFormat } from "@/types/converter";

const categories = [
  { label: "Image", formats: SUPPORTED_OUTPUT_FORMATS.filter((format) => format !== "pdf") },
  { label: "Document", formats: ["pdf"] as const },
];

export function FormatSelector({ value, onChange }: { value: OutputFormat; onChange: (value: OutputFormat) => void }) {
  return <FormatPicker value={value} onChange={onChange} categories={categories} />;
}
