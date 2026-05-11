import { CheckCircle2, Download, Files, X } from "lucide-react";
import { formatFileSize } from "@/lib/format";
import { ConvertedFile } from "@/types/converter";

type BatchResultListProps = {
  files: ConvertedFile[];
  onDownloadAll: () => void;
  onRemove: (fileId: string) => void;
  retentionLabel: string;
};

export function BatchResultList({
  files,
  onDownloadAll,
  onRemove,
  retentionLabel,
}: BatchResultListProps) {
  if (!files.length) {
    return null;
  }

  const heading = files.length === 1 ? "Your image is ready." : "Your images are ready.";

  return (
    <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--background-secondary)] text-[var(--success)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
          <p className="text-lg font-semibold text-[var(--foreground)]">{heading}</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Ready to download. New conversions will be added here.
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {retentionLabel}
          </p>
          </div>
        </div>
        {files.length > 1 ? (
          <button
            type="button"
            onClick={onDownloadAll}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--primary)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--primary)] transition hover:-translate-y-0.5 hover:bg-[var(--background-secondary)]"
          >
            <Files className="h-4 w-4" />
            Download all as ZIP
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex flex-col gap-4 rounded-2xl border bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {file.fileName}
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {formatFileSize(file.size)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
              <a
                href={file.downloadUrl}
                download={file.fileName}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3E5F44] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                aria-label={`Remove ${file.fileName} from downloads`}
                className="inline-flex items-center justify-center gap-2 rounded-full border bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                <X className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
