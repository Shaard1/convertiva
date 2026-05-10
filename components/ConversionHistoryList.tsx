import { Download, History } from "lucide-react";
import { formatFileSize } from "@/lib/format";
import { ConversionHistoryItem } from "@/types/converter";

type ConversionHistoryListProps = {
  items: ConversionHistoryItem[];
};

function formatRetention(convertedAt: string, expiresAt: number) {
  const retentionHours = Math.round(
    (expiresAt - new Date(convertedAt).getTime()) / (60 * 60 * 1000),
  );

  return `Expires after ${retentionHours}h`;
}

export function ConversionHistoryList({ items }: ConversionHistoryListProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="rounded-3xl border bg-[var(--card-muted)] p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-[var(--primary)]" />
        <p className="text-base font-semibold text-[var(--foreground)]">
          Recent conversions
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {item.fileName}
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {item.outputFormat.toUpperCase()} - {formatFileSize(item.size)} -{" "}
                {formatRetention(item.convertedAt, item.expiresAt)}
              </p>
            </div>
            <a
              href={item.downloadUrl}
              download={item.fileName}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--primary)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--primary)] transition hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
