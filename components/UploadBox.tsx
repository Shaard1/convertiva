"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import clsx from "clsx";
import { ImageUp, MousePointerClick, TriangleAlert } from "lucide-react";
import {
  SUPPORTED_INPUT_ACCEPT,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
} from "@/lib/constants";
import { formatFileSize } from "@/lib/format";

type UploadBoxProps = {
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
  maxFileSizeBytes?: number;
};

type DragStatus = "idle" | "accepted" | "rejected";

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function canAcceptDraggedFiles(items: DataTransferItemList) {
  const fileItems = Array.from(items).filter((item) => item.kind === "file");

  if (!fileItems.length) {
    return true;
  }

  return fileItems.every((item) => {
    if (!item.type) {
      return true;
    }

    return SUPPORTED_INPUT_MIME_TYPES.includes(
      item.type as (typeof SUPPORTED_INPUT_MIME_TYPES)[number],
    );
  });
}

function hasUnsupportedFiles(files: File[]) {
  return files.some((file) => {
    const extension = getFileExtension(file.name);
    const hasSupportedExtension = SUPPORTED_INPUT_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_INPUT_EXTENSIONS)[number],
    );
    const hasSupportedMime =
      !file.type ||
      SUPPORTED_INPUT_MIME_TYPES.includes(
        file.type as (typeof SUPPORTED_INPUT_MIME_TYPES)[number],
      );

    return !hasSupportedExtension || !hasSupportedMime;
  });
}

export function UploadBox({
  onFilesSelected,
  compact = false,
  maxFileSizeBytes,
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragStatus, setDragStatus] = useState<DragStatus>("idle");
  const [dropNotice, setDropNotice] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    const files = Array.from(fileList);

    if (hasUnsupportedFiles(files)) {
      setDropNotice("Some files were not recognized. Supported image types work best.");
    } else {
      setDropNotice(null);
    }

    onFilesSelected(files);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragStatus("idle");
    handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragStatus(canAcceptDraggedFiles(event.dataTransfer.items) ? "accepted" : "rejected");
  }

  const sizeLabel = maxFileSizeBytes
    ? ` up to ${formatFileSize(maxFileSizeBytes)} each`
    : "";
  const isDragging = dragStatus !== "idle";
  const isRejected = dragStatus === "rejected";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragStatus("idle")}
      onDrop={handleDrop}
      className={clsx(
        "cursor-pointer border border-dashed text-center transition duration-200",
        compact ? "rounded-2xl px-4 py-4" : "rounded-[1.5rem] px-5 py-7 sm:px-6 sm:py-8",
        isRejected
          ? "border-[var(--danger)] bg-[var(--danger)]/10"
          : isDragging
            ? "scale-[1.01] border-[var(--primary)] bg-[var(--background-secondary)] shadow-[0_16px_40px_rgba(62,95,68,0.12)]"
          : "border-[var(--primary-soft)] bg-[var(--card-muted)] hover:border-[var(--primary)] hover:bg-[var(--background-secondary)]",
      )}
      aria-label="Upload images"
    >
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_INPUT_ACCEPT}
        multiple
        onChange={handleChange}
        className="hidden"
      />
      {compact ? (
        <div className="flex items-center justify-center gap-3 text-left sm:justify-start">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--primary)] shadow-sm">
            <ImageUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {isRejected ? "Unsupported file type" : "Add more images"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Drop files here or browse
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={clsx(
              "mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card)] shadow-sm",
              isRejected ? "text-[var(--danger)]" : "text-[var(--primary)]",
            )}
          >
            {isRejected ? (
              <TriangleAlert className="h-7 w-7" />
            ) : (
              <ImageUp className="h-7 w-7" />
            )}
          </div>
          <p className="mt-5 text-lg font-semibold text-[var(--foreground)]">
            {isRejected
              ? "This file type is not supported"
              : isDragging
                ? "Release to upload"
                : "Upload your images"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
            Drag files here or click to choose them from your device.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1 rounded-full border bg-[var(--card)] px-3 py-2">
              <MousePointerClick className="h-3.5 w-3.5" />
              Browse files
            </span>
            <span className="rounded-full border bg-[var(--card)] px-3 py-2">
              PNG, JPG, WEBP, AVIF and more
            </span>
            {sizeLabel ? (
              <span className="rounded-full border bg-[var(--card)] px-3 py-2">
                {sizeLabel.trim()}
              </span>
            ) : null}
          </div>
          {dropNotice ? (
            <p className="mt-3 text-xs font-medium text-[var(--danger)]">
              {dropNotice}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
