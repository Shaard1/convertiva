import { CheckCircle2, FileImage, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { formatFileSize } from "@/lib/format";
import { ConversionProgressItem } from "@/types/converter";

type ConversionProgressListProps = {
  items: ConversionProgressItem[];
  onRemove?: (fileId: string) => void;
  onDownload?: (fileId: string) => void;
};

function getStageLabel(stage: ConversionProgressItem["stage"]) {
  switch (stage) {
    case "waiting":
      return "Waiting";
    case "uploading":
      return "Uploading";
    case "converting":
      return "Converting";
    case "finalizing":
      return "Finalizing";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
  }
}

export function ConversionProgressList({
  items,
  onRemove,
  onDownload,
}: ConversionProgressListProps) {
  if (!items.length) {
    return null;
  }

  const finishedCount = items.filter((item) => item.stage === "done").length;
  const failedCount = items.filter((item) => item.stage === "failed").length;
  const activeCount = items.length - finishedCount - failedCount;

  return (
    <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">
            {activeCount > 0
              ? `Converting ${items.length} image${items.length === 1 ? "" : "s"}...`
              : failedCount > 0
                ? "Some images could not be converted."
                : "All images are ready."}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            {finishedCount} of {items.length} done
            {failedCount > 0 ? ` - ${failedCount} failed` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const isDone = item.stage === "done";
          const isFailed = item.stage === "failed";

          return (
            <div key={item.id} className="rounded-2xl border bg-[var(--card)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--background-secondary)] text-[var(--primary)]">
                    <FileImage className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {item.fileName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {formatFileSize(item.fileSize)} - {item.originalFormat}
                    </p>
                    <p className="mt-2 text-xs font-medium text-[var(--primary)]">
                      Converting to {item.outputFormat.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  {!isDone && !isFailed && onRemove ? (
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  ) : null}

                  {isDone && onDownload ? (
                    <button
                      type="button"
                      onClick={() => onDownload(item.id)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#3E5F44] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2F4A35]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Download
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 text-[var(--muted-foreground)]">
                    {isFailed ? (
                      <TriangleAlert className="h-4 w-4 text-[var(--danger)]" />
                    ) : item.stage === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                    ) : (
                      <LoaderCircle className="h-4 w-4 animate-spin text-[var(--primary)]" />
                    )}
                    {getStageLabel(item.stage)}
                  </span>
                  <span
                    className={isFailed ? "text-[var(--danger)]" : "text-[var(--muted-foreground)]"}
                  >
                    {item.progress}%
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--background-secondary)]">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      isFailed ? "bg-[var(--danger)]" : "bg-[var(--primary)]"
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>

                {item.error ? (
                  <p className="mt-2 text-xs text-[var(--danger)]">{item.error}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
