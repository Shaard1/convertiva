"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import clsx from "clsx";
import {
  ChevronDown,
  Cloud,
  FolderOpen,
  ImageUp,
  Link,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import {
  SUPPORTED_INPUT_ACCEPT,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
} from "@/lib/constants";

type UploadBoxProps = {
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
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
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragStatus, setDragStatus] = useState<DragStatus>("idle");
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUrlFormOpen, setIsUrlFormOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isImportingUrl, setIsImportingUrl] = useState(false);

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

  function openFilePicker() {
    setIsMenuOpen(false);
    setIsUrlFormOpen(false);
    inputRef.current?.click();
  }

  async function handleUrlImport() {
    const trimmedUrl = imageUrl.trim();

    if (!trimmedUrl) {
      setDropNotice("Enter an image URL first.");
      return;
    }

    setIsImportingUrl(true);
    setDropNotice(null);

    try {
      const response = await fetch("/api/import-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not import that image URL.");
      }

      const blob = await response.blob();
      const fileName = response.headers.get("x-imported-file-name")
        ? decodeURIComponent(response.headers.get("x-imported-file-name") as string)
        : "imported-image";
      const file = new File([blob], fileName, {
        type: blob.type || "application/octet-stream",
      });

      setImageUrl("");
      setIsUrlFormOpen(false);
      onFilesSelected([file]);
    } catch (error) {
      setDropNotice(
        error instanceof Error
          ? error.message
          : "Could not import that image URL.",
      );
    } finally {
      setIsImportingUrl(false);
    }
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

  const isDragging = dragStatus !== "idle";
  const isRejected = dragStatus === "rejected";

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragStatus("idle")}
      onDrop={handleDrop}
      className={clsx(
        "cursor-pointer border border-dashed text-center transition duration-200",
        compact ? "rounded-2xl px-4 py-4" : "rounded-[1.5rem] px-5 py-6 sm:px-6 sm:py-7",
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
        <button
          type="button"
          onClick={openFilePicker}
          className="flex w-full items-center justify-center gap-3 text-left sm:justify-start"
        >
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
        </button>
      ) : (
        <>
          <div
            className={clsx(
              "mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card)] shadow-sm",
              isRejected ? "text-[var(--danger)]" : "text-[var(--primary)]",
            )}
          >
            {isRejected ? (
              <TriangleAlert className="h-6 w-6" />
            ) : (
              <ImageUp className="h-6 w-6" />
            )}
          </div>
          <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">
            {isRejected
              ? "This file type is not supported"
              : isDragging
                ? "Release to upload"
                : "Upload your images"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
            or drop your files here.
          </p>
          <div className="relative mx-auto mt-5 inline-block text-left">
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-expanded={isMenuOpen}
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#3E5F44] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2F4A35]"
            >
              <ImageUp className="h-4 w-4" />
              Select images
              <ChevronDown
                className={clsx(
                  "h-4 w-4 transition-transform",
                  isMenuOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </button>

            <div
              className={clsx(
                "absolute left-1/2 z-20 mt-2 w-64 -translate-x-1/2 overflow-hidden rounded-xl border bg-[var(--card)] text-sm shadow-xl transition-all duration-180 ease-out",
                isMenuOpen
                  ? "visible translate-y-0 opacity-100"
                  : "pointer-events-none invisible -translate-y-1 opacity-0",
              )}
            >
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left font-semibold text-[var(--foreground)] transition hover:bg-[var(--card-muted)]"
                >
                  <FolderOpen className="h-4 w-4 text-[var(--primary)]" />
                  From my computer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsUrlFormOpen(true);
                  }}
                  className="flex w-full items-center gap-3 border-t px-4 py-3 text-left font-semibold text-[var(--foreground)] transition hover:bg-[var(--card-muted)]"
                >
                  <Link className="h-4 w-4 text-[var(--primary)]" />
                  By URL
                </button>
                {["From Google Drive", "From Dropbox", "From OneDrive"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    title="Coming soon"
                    className="flex w-full cursor-not-allowed items-center gap-3 border-t px-4 py-3 text-left font-semibold text-[var(--muted-foreground)] opacity-60"
                  >
                    <Cloud className="h-4 w-4" />
                    {label}
                    <span className="ml-auto text-[10px] font-medium uppercase">
                      Soon
                    </span>
                  </button>
                ))}
              </div>
          </div>

          {isUrlFormOpen ? (
            <div className="mx-auto mt-4 flex max-w-lg flex-col gap-2 rounded-2xl border bg-[var(--card)] p-3 sm:flex-row">
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="Paste an image URL"
                className="min-w-0 flex-1 rounded-xl border bg-[var(--card-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={handleUrlImport}
                disabled={isImportingUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3E5F44] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F4A35] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImportingUrl ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                Add image
              </button>
            </div>
          ) : null}
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
