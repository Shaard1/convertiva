"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import clsx from "clsx";
import { ImageUp, TriangleAlert } from "lucide-react";
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
      setDropNotice("Some files may not be supported.");
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
        "cursor-pointer border border-dashed text-center transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
        compact ? "rounded-2xl px-4 py-4" : "rounded-3xl px-6 py-8",
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
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--primary)] shadow-sm">
            <ImageUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {isRejected ? "Unsupported file type" : "Add more images"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Drag files here or click to browse
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
              ? "That file type is not supported"
              : isDragging
                ? "Release to upload"
                : "Drop your images here"}
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            or click to browse
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Supports AVIF, BMP, GIF, ICO, JPG, JPEG, JFIF, PNG, TIFF, and WEBP{sizeLabel}.
          </p>
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
