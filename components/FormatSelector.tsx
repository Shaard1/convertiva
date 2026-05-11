import { ChevronDown } from "lucide-react";
import { SUPPORTED_OUTPUT_FORMATS } from "@/lib/constants";
import { OutputFormat } from "@/types/converter";

type FormatSelectorProps = {
  value: OutputFormat;
  onChange: (value: OutputFormat) => void;
};

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div>
      <label
        htmlFor="output-format"
        className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
      >
        Convert to
      </label>
      <div className="relative">
        <select
          id="output-format"
          value={value}
          onChange={(event) => onChange(event.target.value as OutputFormat)}
          className="w-full appearance-none rounded-2xl border bg-[var(--card)] px-4 py-3 pr-11 text-sm font-semibold uppercase text-[var(--foreground)] outline-none transition hover:border-[var(--primary)] focus:border-[var(--primary)]"
        >
          {SUPPORTED_OUTPUT_FORMATS.map((format) => (
            <option key={format} value={format}>
              {format.toUpperCase()}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      </div>
    </div>
  );
}
