"use client";

import { useEffect, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import JSZip from "jszip";
import { LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { BatchResultList } from "@/components/BatchResultList";
import { ConversionHistoryList } from "@/components/ConversionHistoryList";
import { ConversionProgressList } from "@/components/ConversionProgressList";
import { FileList } from "@/components/FileList";
import { FormatSelector } from "@/components/FormatSelector";
import { Navbar } from "@/components/Navbar";
import { UploadBox } from "@/components/UploadBox";
import { UsageBadge } from "@/components/UsageBadge";
import { signOutUser } from "@/lib/auth";
import {
  APP_NAME,
  CONVERSION_POLICIES,
  LOGGED_IN_HISTORY_LIMIT,
} from "@/lib/constants";
import {
  loadAuthenticatedConversionHistory,
  saveAuthenticatedConversionHistory,
} from "@/lib/conversion-history";
import { validateFile } from "@/lib/file";
import { formatFileSize, getFileFormatLabel } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  createAuthenticatedUsage,
  getAuthenticatedUsage,
  getGuestUsage,
  incrementGuestUsage,
} from "@/lib/usage";
import { createZipFromFiles } from "@/lib/zip";
import { AuthUser } from "@/types/auth";
import {
  ConvertedFile,
  ConversionHistoryItem,
  ConversionProgressItem,
  ConverterState,
  OutputFormat,
  UploadedFile,
} from "@/types/converter";
import { UserUsage } from "@/types/usage";

const initialState: ConverterState = {
  isConverting: false,
  error: null,
  successMessage: null,
};

function createUploadedFile(file: File): UploadedFile {
  return {
    id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
    file,
    name: file.name,
    size: file.size,
    originalFormat: getFileFormatLabel(file.name),
    status: "ready",
  };
}

function createProgressItems(
  files: UploadedFile[],
  outputFormat: OutputFormat,
): ConversionProgressItem[] {
  return files.map((file) => ({
    id: file.id,
    fileName: file.name,
    fileSize: file.size,
    originalFormat: file.originalFormat,
    outputFormat,
    progress: 0,
    stage: "waiting",
    error: null,
  }));
}

function applyUsageStatusToFiles(
  files: UploadedFile[],
  remainingConversions: number,
): UploadedFile[] {
  const normalizedRemaining = Math.max(remainingConversions, 0);

  return files.map((file, index) => ({
    ...file,
    status: index < normalizedRemaining ? "ready" : "over_limit",
  }));
}

function partitionFilesByLimit(files: UploadedFile[], remainingConversions: number) {
  const normalizedRemaining = Math.max(remainingConversions, 0);
  const readyFiles = files.slice(0, normalizedRemaining);
  const overLimitFiles = files.slice(normalizedRemaining);
  return { readyFiles, overLimitFiles };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallbackValue);
      }
    }, timeoutMs);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallbackValue);
        }
      });
  });
}

function mapSupabaseUser(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
  };
}

function parseConversionError(payload: unknown, fallbackMessage: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallbackMessage;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHeaderFileName(value: string | null, fallbackName: string) {
  if (!value) {
    return fallbackName;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return fallbackName;
  }
}

function getActivePolicy(isGuest: boolean) {
  return isGuest ? CONVERSION_POLICIES.guest : CONVERSION_POLICIES.authenticated;
}

function createConvertedFile(
  fileName: string,
  mimeType: string,
  blob: Blob,
  id: string,
  retentionMs: number,
) {
  const convertedAt = new Date().toISOString();

  return {
    id,
    fileName,
    mimeType,
    size: blob.size,
    blob,
    downloadUrl: URL.createObjectURL(blob),
    convertedAt,
    expiresAt: Date.now() + retentionMs,
  } satisfies ConvertedFile;
}

export function ConverterCard() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [conversionHistory, setConversionHistory] = useState<ConversionHistoryItem[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [state, setState] = useState<ConverterState>(initialState);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [usageNotice, setUsageNotice] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [progressItems, setProgressItems] = useState<ConversionProgressItem[]>([]);

  function updateProgressStage(
    stage: ConversionProgressItem["stage"],
    progress: number,
  ) {
    setProgressItems((currentItems) =>
      currentItems.map((item) =>
        item.stage === "done" || item.stage === "failed"
          ? item
          : { ...item, stage, progress },
      ),
    );
  }

  function syncFileStatuses(remainingConversions: number) {
    setSelectedFiles((currentFiles) =>
      applyUsageStatusToFiles(currentFiles, remainingConversions),
    );
  }

  function clearConvertedFiles() {
    convertedFiles.forEach((file) => URL.revokeObjectURL(file.downloadUrl));
    setConvertedFiles([]);
  }

  function addFilesToHistory(files: ConvertedFile[]) {
    if (!user) {
      return;
    }

    setConversionHistory((currentHistory) => {
      const nextHistory = [
        ...files.map((file) => ({
          id: `history-${file.id}-${crypto.randomUUID()}`,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size,
          convertedAt: file.convertedAt,
          expiresAt: file.expiresAt,
          downloadUrl: URL.createObjectURL(file.blob),
          outputFormat,
        })),
        ...currentHistory,
      ].slice(0, LOGGED_IN_HISTORY_LIMIT);
      const activeIds = new Set(nextHistory.map((file) => file.id));

      currentHistory.forEach((file) => {
        if (!activeIds.has(file.id)) {
          URL.revokeObjectURL(file.downloadUrl);
        }
      });

      return nextHistory;
    });
  }

  function removeExpiredFiles() {
    const now = Date.now();

    setConvertedFiles((currentFiles) => {
      const activeFiles = currentFiles.filter((file) => file.expiresAt > now);
      currentFiles.forEach((file) => {
        if (file.expiresAt <= now) {
          URL.revokeObjectURL(file.downloadUrl);
        }
      });
      return activeFiles;
    });

    setConversionHistory((currentHistory) => {
      const activeHistory = currentHistory.filter((file) => file.expiresAt > now);
      return activeHistory;
    });
  }

  function resetFeedback() {
    setState(initialState);
  }

  function clearProgress() {
    setProgressItems([]);
  }

  async function syncAuthenticatedUsage(authUser: AuthUser) {
    try {
      const nextUsage = await getAuthenticatedUsage(authUser);
      const nextHistory = await loadAuthenticatedConversionHistory(authUser);
      setUsage(nextUsage);
      setConversionHistory(nextHistory);
      syncFileStatuses(nextUsage.remaining);
      setUsageNotice(null);
      return nextUsage;
    } catch {
      const fallbackUsage = createAuthenticatedUsage();
      setUsage(fallbackUsage);
      syncFileStatuses(fallbackUsage.remaining);
      setUsageNotice(
        "We couldn't sync your account usage right now. Conversions still work, but your logged-in usage may not persist until Supabase is configured correctly.",
      );
      return fallbackUsage;
    }
  }

  function syncAuthenticatedUsageInBackground(authUser: AuthUser) {
    setUsageNotice("Logged in. Syncing your usage...");
    void syncAuthenticatedUsage(authUser);
  }

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseBrowserClient();

    async function initialize() {
      const guestUsage = getGuestUsage();

      if (isMounted) {
        setUsage(guestUsage);
        setIsInitializing(false);
      }

      if (!supabase) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authUser = mapSupabaseUser(session);

      if (!isMounted || !authUser) {
        return;
      }

      setUser(authUser);
      syncAuthenticatedUsageInBackground(authUser);
    }

    initialize();

    let subscription:
      | {
          unsubscribe: () => void;
        }
      | undefined;

    if (supabase) {
      const authListener = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, session: Session | null) => {
          const authUser = mapSupabaseUser(session);
          setUser(authUser);

          if (!authUser) {
            const guestUsage = getGuestUsage();
            setUsage(guestUsage);
            syncFileStatuses(guestUsage.remaining);
            setUsageNotice(null);
            return;
          }

          syncAuthenticatedUsageInBackground(authUser);
        },
      );

      subscription = authListener.data.subscription;
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      convertedFiles.forEach((file) => URL.revokeObjectURL(file.downloadUrl));
    };
  }, [convertedFiles]);

  useEffect(() => {
    const cleanupTimer = window.setInterval(removeExpiredFiles, 60_000);
    return () => window.clearInterval(cleanupTimer);
  }, []);

  function openAuthModal(mode: "login" | "signup") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  function handleFilesSelected(files: File[]) {
    const validFiles: UploadedFile[] = [];
    let firstError: string | null = null;
    const policy = getActivePolicy(usage?.isGuest ?? !user);

    for (const file of files) {
      const validation = validateFile(file, policy.maxFileSizeBytes);

      if (!validation.isValid) {
        firstError ??=
          validation.error ?? "Something went wrong while selecting files.";
        continue;
      }

      validFiles.push(createUploadedFile(file));
    }

    if (!validFiles.length) {
      setState({
        isConverting: false,
        error: firstError ?? "Unsupported file type detected.",
        successMessage: null,
      });
      return;
    }

    clearConvertedFiles();
    clearProgress();
    setSelectedFiles((currentFiles) => {
      const nextFiles = [...currentFiles, ...validFiles];
      const remaining = usage?.remaining ?? Number.POSITIVE_INFINITY;
      return applyUsageStatusToFiles(nextFiles, remaining);
    });
    setState({
      isConverting: false,
      error: firstError,
      successMessage: null,
    });
  }

  function handleRemoveFile(fileId: string) {
    clearConvertedFiles();
    clearProgress();
    resetFeedback();
    setSelectedFiles((currentFiles) => {
      const filteredFiles = currentFiles.filter((file) => file.id !== fileId);
      const remaining = usage?.remaining ?? Number.POSITIVE_INFINITY;
      return applyUsageStatusToFiles(filteredFiles, remaining);
    });
  }

  async function refreshUsageAfterSuccess(successfulConversions: number) {
    if (successfulConversions <= 0) {
      return;
    }

    if (user) {
      try {
        const updatedUsage = await getAuthenticatedUsage(user);
        setUsage(updatedUsage);
        syncFileStatuses(updatedUsage.remaining);
        setUsageNotice(null);
      } catch {
        setUsageNotice(
          "Your files converted successfully, but we couldn't sync your account usage from Supabase.",
        );
      }
      return;
    }

    const updatedUsage = incrementGuestUsage(successfulConversions);
    setUsage(updatedUsage);
    syncFileStatuses(updatedUsage.remaining);
  }

  async function finalizeProgress(results: ConvertedFile[]) {
    setProgressItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        progress: Math.max(item.progress, 92),
        stage: "finalizing",
        error: null,
      })),
    );
    await delay(180);
    setProgressItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        progress: 100,
        stage: results.some((result) => result.id === item.id) ? "done" : "failed",
        error: results.some((result) => result.id === item.id)
          ? null
          : "Could not convert this image. Try another file.",
      })),
    );
  }

  async function handleConvert() {
    if (!selectedFiles.length) {
      setState({
        isConverting: false,
        error: "No image files were uploaded.",
        successMessage: null,
      });
      return;
    }

    const activeUsage = user ? await syncAuthenticatedUsage(user) : getGuestUsage();
    const activePolicy = getActivePolicy(activeUsage.isGuest);

    setUsage(activeUsage);
    syncFileStatuses(activeUsage.remaining);

    if (activeUsage.remaining <= 0) {
      setState({
        isConverting: false,
        error: activeUsage.isGuest
          ? "Guest limit reached. Sign in to convert more images."
          : "You have reached your daily conversion limit.",
        successMessage: null,
      });
      return;
    }

    if (selectedFiles.length > activePolicy.maxBatchFiles) {
      setState({
        isConverting: false,
        error: `Upload up to ${activePolicy.maxBatchFiles} images at once for your current plan.`,
        successMessage: null,
      });
      return;
    }

    const { readyFiles, overLimitFiles } = partitionFilesByLimit(
      selectedFiles,
      activeUsage.remaining,
    );

    if (overLimitFiles.length > 0 || selectedFiles.length > activeUsage.remaining) {
      setState({
        isConverting: false,
        error: `You only have ${activeUsage.remaining} conversions left. Remove ${Math.max(
          selectedFiles.length - activeUsage.remaining,
          0,
        )} images or sign in to continue.`,
        successMessage: null,
      });
      return;
    }

    if (!readyFiles.length) {
      setState({
        isConverting: false,
        error: "No valid images are ready to convert.",
        successMessage: null,
      });
      return;
    }

    clearConvertedFiles();
    setProgressItems(createProgressItems(readyFiles, outputFormat));
    setState({
      isConverting: true,
      error: null,
      successMessage: null,
    });

    const formData = new FormData();
    formData.append("outputFormat", outputFormat);
    readyFiles.forEach((file) => formData.append("files", file.file, file.name));

    try {
      updateProgressStage("uploading", 25);
      const supabase = getSupabaseBrowserClient();
      const sessionResult = user && supabase
        ? await supabase.auth.getSession()
        : null;
      const accessToken = sessionResult?.data.session?.access_token;

      updateProgressStage("converting", 65);
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        throw new Error(
          parseConversionError(
            payload,
            "Something went wrong while converting. Please try again.",
          ),
        );
      }

      updateProgressStage("finalizing", 90);
      const responseBlob = await response.blob();
      let results: ConvertedFile[];

      if (readyFiles.length === 1) {
        const fileName = decodeHeaderFileName(
          response.headers.get("x-converted-file-name"),
          `${readyFiles[0].name}.${outputFormat}`,
        );
        const mimeType = response.headers.get("content-type") ?? responseBlob.type;
        results = [
          createConvertedFile(
            fileName,
            mimeType,
            responseBlob,
            readyFiles[0].id,
            activePolicy.retentionMs,
          ),
        ];
      } else {
        const zip = await JSZip.loadAsync(responseBlob);
        const zipEntries = Object.values(zip.files).filter((entry) => !entry.dir);
        const blobs = await Promise.all(
          zipEntries.map(async (entry, index) => {
            const blob = await entry.async("blob");
            return createConvertedFile(
              entry.name,
              blob.type || "application/octet-stream",
              blob,
              readyFiles[index]?.id ?? `${entry.name}-${crypto.randomUUID()}`,
              activePolicy.retentionMs,
            );
          }),
        );
        results = blobs;
      }

      await finalizeProgress(results);
      setConvertedFiles(results);
      addFilesToHistory(results);
      if (user) {
        const historyResult = await saveAuthenticatedConversionHistory(
          user,
          results,
          outputFormat,
        );

        if (historyResult.error) {
          setUsageNotice(
            "Your files converted successfully, but persistent history is not configured yet.",
          );
        }
      }
      await refreshUsageAfterSuccess(results.length);
      setState({
        isConverting: false,
        error: null,
        successMessage:
          results.length === 1 ? "Your image is ready." : "All images are ready.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while converting. Please try again.";

      setProgressItems((currentItems) =>
        currentItems.map((item) => ({
          ...item,
          stage: "failed",
          progress: Math.max(item.progress, 18),
          error: message,
        })),
      );
      setState({
        isConverting: false,
        error: message,
        successMessage: null,
      });
    }
  }

  function handleDownloadSingle(fileId: string) {
    const file = convertedFiles.find((item) => item.id === fileId);

    if (!file) {
      return;
    }

    const link = document.createElement("a");
    link.href = file.downloadUrl;
    link.download = file.fileName;
    link.click();
  }

  async function handleDownloadAll() {
    const zipBlob = await createZipFromFiles(convertedFiles);
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted-images.zip";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    const guestUsage = getGuestUsage();
    setUser(null);
    setUsage(guestUsage);
    syncFileStatuses(guestUsage.remaining);
    clearProgress();
    setUsageNotice(null);
    setConversionHistory([]);

    const result = await withTimeout(signOutUser(), 8000, {
      error: "Logout took too long, but your local session is already cleared.",
    });

    if (result.error) {
      setUsageNotice(result.error);
    }
  }

  const limitReached = usage ? usage.remaining <= 0 : false;
  const activePolicy = getActivePolicy(usage?.isGuest ?? !user);
  const overLimitCount = selectedFiles.filter(
    (file) => file.status === "over_limit",
  ).length;
  const overBatchLimit = selectedFiles.length > activePolicy.maxBatchFiles;
  const validSelectedCount = selectedFiles.length - overLimitCount;
  const convertDisabled =
    isInitializing ||
    state.isConverting ||
    !selectedFiles.length ||
    limitReached ||
    overLimitCount > 0 ||
    overBatchLimit;
  const hasSelectedFiles = selectedFiles.length > 0;
  const showProgressList =
    state.isConverting || (progressItems.length > 0 && convertedFiles.length === 0);
  const exceedsLimitMessage =
    overLimitCount > 0 && usage
      ? `You only have ${usage.remaining} conversions left. Remove ${overLimitCount} images or sign in to continue.`
      : null;
  const exceedsBatchMessage = overBatchLimit
    ? `Your current plan supports up to ${activePolicy.maxBatchFiles} images at once.`
    : null;

  return (
    <>
      <Navbar
        user={user}
        usage={usage}
        onOpenAuth={openAuthModal}
        onLogout={handleLogout}
      />

      <main>
        <section className="relative overflow-hidden px-4 pb-18 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full border bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--primary)]">
                Fast image conversion
              </span>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-6xl">
                Convert images in seconds.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                A clean and simple image converter for AVIF, BMP, GIF, ICO, JPG, JPEG, JFIF, PNG, TIFF, and WEBP files.
                Upload, convert, and download without the clutter.
              </p>
            </div>

            <div id="converter" className="converter-spotlight mx-auto mt-10 max-w-4xl">
              <div className="card-shadow rounded-[2rem] border bg-[var(--card)] p-5 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
                      <Sparkles className="h-4 w-4" />
                      {APP_NAME}
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
                      Upload, convert, and download
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      Single image or full batch conversion with calm, clean controls.
                    </p>
                  </div>
                  <UsageBadge usage={usage} />
                </div>

                <div className="mt-8 space-y-6">
                  {!hasSelectedFiles ? (
                    <UploadBox
                      onFilesSelected={handleFilesSelected}
                      maxFileSizeBytes={activePolicy.maxFileSizeBytes}
                    />
                  ) : null}

                  <div className="space-y-4">
                    {hasSelectedFiles ? (
                      <div className="rounded-3xl border bg-[var(--card-muted)] p-4">
                        <UploadBox
                          onFilesSelected={handleFilesSelected}
                          compact
                          maxFileSizeBytes={activePolicy.maxFileSizeBytes}
                        />
                      </div>
                    ) : null}

                    {showProgressList ? (
                      <ConversionProgressList
                        items={progressItems}
                        onDownload={convertedFiles.length ? handleDownloadSingle : undefined}
                      />
                    ) : (
                      <FileList files={selectedFiles} onRemove={handleRemoveFile} />
                    )}

                    <div className="rounded-3xl border bg-[var(--card-muted)] p-5 sm:p-6">
                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] lg:items-end">
                        <div className="space-y-3">
                          <FormatSelector value={outputFormat} onChange={setOutputFormat} />
                          <p className="rounded-2xl border border-dashed bg-[var(--card)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
                            Choose the format you want back. Conversion settings are
                            optimized automatically for clean, reliable downloads.
                          </p>
                        </div>
                        <div className="space-y-3 rounded-2xl border bg-[var(--card)] p-4">
                          {limitReached && usage?.isGuest ? (
                            <button
                              type="button"
                              onClick={() => openAuthModal("signup")}
                              className="inline-flex w-full justify-center rounded-full border border-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--background-secondary)]"
                            >
                              Sign in to unlock more
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleConvert}
                            disabled={convertDisabled}
                            className="inline-flex w-full items-center justify-center rounded-full bg-[#3E5F44] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2F4A35] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {state.isConverting ? (
                              <>
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Converting...
                              </>
                            ) : selectedFiles.length === 1 ? (
                              "Convert image"
                            ) : (
                              `Convert ${validSelectedCount} images`
                            )}
                          </button>
                          {!hasSelectedFiles ? (
                            <p className="text-center text-sm text-[var(--muted-foreground)]">
                              Upload at least one image to start.
                            </p>
                          ) : null}
                          <p className="text-center text-xs text-[var(--muted-foreground)]">
                            {activePolicy.maxBatchFiles} images per batch -{" "}
                            {formatFileSize(activePolicy.maxFileSizeBytes)} per image
                          </p>
                        </div>
                      </div>

                      {exceedsLimitMessage ? (
                        <div className="mt-4 rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
                          {exceedsLimitMessage}
                        </div>
                      ) : null}

                      {exceedsBatchMessage ? (
                        <div className="mt-4 rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
                          {exceedsBatchMessage}
                        </div>
                      ) : null}

                      {!hasSelectedFiles ? (
                        <div className="mt-4 rounded-2xl border border-dashed bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                          Start by dragging in an AVIF, BMP, GIF, ICO, JPG, JPEG, JFIF, PNG, TIFF, or WEBP file, then choose the format you want back.
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-3 rounded-3xl border bg-[var(--card-muted)] p-4 text-sm text-[var(--muted-foreground)]">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                      <p className="leading-6">
                        Files are processed temporarily. Guest downloads expire after 1 hour,
                        and logged-in history keeps the last 20 conversions for 24 hours.
                      </p>
                    </div>
                  </div>

                  {state.error ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
                    >
                      {state.error}
                    </div>
                  ) : null}

                  {usageNotice ? (
                    <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--background-secondary)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      {usageNotice}
                    </div>
                  ) : null}

                  {state.successMessage && convertedFiles.length ? (
                    <BatchResultList
                      files={convertedFiles}
                      outputFormat={outputFormat}
                      onDownloadAll={handleDownloadAll}
                      retentionLabel={
                        user
                          ? "Downloads expire after 24 hours."
                          : "Downloads expire after 1 hour."
                      }
                    />
                  ) : null}

                  {user ? <ConversionHistoryList items={conversionHistory} /> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
