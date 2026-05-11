import { CheckCircle2, CircleAlert, Trash2 } from "lucide-react";
import { formatFileSize } from "@/lib/format";
import { UploadedFile } from "@/types/converter";

type FileListProps = {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
};

export function FileList({ files, onRemove }: FileListProps) {
  if (!files.length) {
    return null;
  }

  return (
    <div className="space-y-3" aria-label="Selected files">
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
            file.status === "over_limit"
              ? "border-[var(--danger)]/35 bg-[var(--danger)]/10"
              : "bg-[var(--card-muted)]"
          }`}
        >
          <div className="flex min-w-0 gap-3">
            <span
              className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                file.status === "over_limit"
                  ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                  : "bg-[var(--background-secondary)] text-[var(--success)]"
              }`}
              aria-hidden="true"
            >
              {file.status === "over_limit" ? (
                <CircleAlert className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
            <p
              className={`truncate text-sm font-medium ${
                file.status === "over_limit"
                  ? "text-[var(--danger)]"
                  : "text-[var(--foreground)]"
              }`}
            >
              {file.name}
            </p>
            <div
              className={`mt-2 flex flex-wrap gap-2 text-xs ${
                file.status === "over_limit"
                  ? "text-[var(--danger)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              <span className="rounded-full border bg-[var(--card)] px-2.5 py-1">
                {formatFileSize(file.size)}
              </span>
              <span className="rounded-full border bg-[var(--card)] px-2.5 py-1">
                {file.originalFormat}
              </span>
              <span className="rounded-full border bg-[var(--card)] px-2.5 py-1">
                {file.status === "over_limit" ? "Limit reached" : "Ready"}
              </span>
            </div>
            {file.status === "over_limit" ? (
              <p className="mt-2 text-xs leading-5 text-[var(--danger)]">
                Remove this file or sign in for more conversions.
              </p>
            ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            aria-label={`Remove ${file.name}`}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] sm:self-auto"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
