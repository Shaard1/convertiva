import { Trash2 } from "lucide-react";
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
    <div className="space-y-3">
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
            file.status === "over_limit"
              ? "border-[var(--danger)]/35 bg-[var(--danger)]/10"
              : "bg-[var(--card-muted)]"
          }`}
        >
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
              className={`mt-2 flex flex-wrap gap-3 text-xs ${
                file.status === "over_limit"
                  ? "text-[var(--danger)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              <span>{formatFileSize(file.size)}</span>
              <span>Format: {file.originalFormat}</span>
              <span>
                Status: {file.status === "over_limit" ? "Over limit" : "Ready"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            aria-label={`Remove ${file.name}`}
            className="inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] sm:self-auto"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
