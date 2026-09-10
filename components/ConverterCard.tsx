"use client";

import { useEffect, useRef, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import JSZip from "jszip";
import { LoaderCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { BatchResultList } from "@/components/BatchResultList";
import { ConversionHistoryList } from "@/components/ConversionHistoryList";
import { ConversionProgressList } from "@/components/ConversionProgressList";
import { FileList } from "@/components/FileList";
import { FormatSelector } from "@/components/FormatSelector";
import { Navbar } from "@/components/Navbar";
import { UploadBox } from "@/components/UploadBox";
import { signOutUser } from "@/lib/auth";
import {
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
  getSyncedGuestUsage,
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
  OutputOptions,
  UploadedFile,
} from "@/types/converter";
import { UserUsage } from "@/types/usage";

const initialState: ConverterState = {
  isConverting: false,
  error: null,
  successMessage: null,
};

const CLIENT_CONVERSION_BATCH_SIZE = 5;

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

function chunkFiles(files: UploadedFile[], chunkSize: number) {
  const chunks: UploadedFile[][] = [];

  for (let index = 0; index < files.length; index += chunkSize) {
    chunks.push(files.slice(index, index + chunkSize));
  }

  return chunks;
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
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [widthInput, setWidthInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [fitMode, setFitMode] = useState<NonNullable<OutputOptions["fitMode"]>>("max");
  const [stripMetadata, setStripMetadata] = useState(true);
  const [draftWidthInput, setDraftWidthInput] = useState("");
  const [draftHeightInput, setDraftHeightInput] = useState("");
  const [draftFitMode, setDraftFitMode] = useState<NonNullable<OutputOptions["fitMode"]>>("max");
  const [draftStripMetadata, setDraftStripMetadata] = useState(true);
  const [isFitMenuOpen, setIsFitMenuOpen] = useState(false);
  const optionsFirstFieldRef = useRef<HTMLInputElement | null>(null);
  const optionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOptionsOpenRef = useRef(false);

  function updateProgressStageForFiles(
    files: UploadedFile[],
    stage: ConversionProgressItem["stage"],
    progress: number,
    error: string | null = null,
  ) {
    const fileIds = new Set(files.map((file) => file.id));

    setProgressItems((currentItems) =>
      currentItems.map((item) =>
        fileIds.has(item.id)
          ? {
              ...item,
              stage,
              progress: Math.max(item.progress, progress),
              error,
            }
          : item,
      ),
    );
  }

  function syncFileStatuses(remainingConversions: number) {
    setSelectedFiles((currentFiles) =>
      applyUsageStatusToFiles(currentFiles, remainingConversions),
    );
  }

  function handleRemoveConvertedFile(fileId: string) {
    setConvertedFiles((currentFiles) => {
      const fileToRemove = currentFiles.find((file) => file.id === fileId);

      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.downloadUrl);
      }

      return currentFiles.filter((file) => file.id !== fileId);
    });
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

      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      const authUser = mapSupabaseUser(session);

      if (!isMounted) {
        return;
      }

      if (authUser) {
        setUser(authUser);
        syncAuthenticatedUsageInBackground(authUser);
        return;
      }

      const synchronizedGuestUsage = await getSyncedGuestUsage();

      if (isMounted) {
        setUsage(synchronizedGuestUsage);
        syncFileStatuses(synchronizedGuestUsage.remaining);
      }
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
            const guestUsage = await getSyncedGuestUsage();

            if (!isMounted) {
              return;
            }

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

  useEffect(() => {
    if (!selectedFiles.length) {
      setIsOptionsOpen(false);
    }
  }, [selectedFiles.length]);

  useEffect(() => {
    if (!isOptionsOpen) {
      setIsFitMenuOpen(false);
    }
  }, [isOptionsOpen]);

  useEffect(() => {
    if (!isOptionsOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeOptionsModal();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOptionsOpen]);

  useEffect(() => {
    if (isOptionsOpen) {
      optionsFirstFieldRef.current?.focus();
    }
  }, [isOptionsOpen]);

  useEffect(() => {
    if (wasOptionsOpenRef.current && !isOptionsOpen) {
      optionsTriggerRef.current?.focus();
    }

    wasOptionsOpenRef.current = isOptionsOpen;
  }, [isOptionsOpen]);

  function openOptionsModal(trigger?: HTMLButtonElement) {
    if (trigger) {
      optionsTriggerRef.current = trigger;
    }
    setDraftWidthInput(widthInput);
    setDraftHeightInput(heightInput);
    setDraftFitMode(fitMode);
    setDraftStripMetadata(stripMetadata);
    setIsOptionsOpen(true);
  }

  function closeOptionsModal() {
    setIsOptionsOpen(false);
  }

  function applyOptionsAndClose() {
    setWidthInput(draftWidthInput);
    setHeightInput(draftHeightInput);
    setFitMode(draftFitMode);
    setStripMetadata(draftStripMetadata);
    setIsFitMenuOpen(false);
    setIsOptionsOpen(false);
  }

  function resetDraftImageOptions() {
    setDraftWidthInput("");
    setDraftHeightInput("");
    setDraftFitMode("max");
    setDraftStripMetadata(true);
  }

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

  async function convertFileBatch(
    files: UploadedFile[],
    outputFormat: OutputFormat,
    retentionMs: number,
    outputOptions: OutputOptions,
    accessToken?: string,
  ): Promise<ConvertedFile[]> {
    const formData = new FormData();
    formData.append("outputFormat", outputFormat);
    formData.append("outputOptions", JSON.stringify(outputOptions));
    files.forEach((file) => formData.append("files", file.file, file.name));

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

    const responseBlob = await response.blob();

    if (files.length === 1) {
      const fileName = decodeHeaderFileName(
        response.headers.get("x-converted-file-name"),
        `${files[0].name}.${outputFormat}`,
      );
      const mimeType = response.headers.get("content-type") ?? responseBlob.type;

      return [
        createConvertedFile(
          fileName,
          mimeType,
          responseBlob,
          files[0].id,
          retentionMs,
        ),
      ];
    }

    const zip = await JSZip.loadAsync(responseBlob);
    const zipEntries = Object.values(zip.files).filter((entry) => !entry.dir);

    return Promise.all(
      zipEntries.map(async (entry, index) => {
        const blob = await entry.async("blob");

        return createConvertedFile(
          entry.name,
          blob.type || "application/octet-stream",
          blob,
          files[index]?.id ?? `${entry.name}-${crypto.randomUUID()}`,
          retentionMs,
        );
      }),
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

    const activeUsage = user
      ? await syncAuthenticatedUsage(user)
      : await getSyncedGuestUsage();
    const activePolicy = getActivePolicy(activeUsage.isGuest);
    const resolvedOutputOptions: OutputOptions = {
      quality: 90,
      backgroundColor: "#ffffff",
      keepMetadata: !stripMetadata,
      fitMode,
      width: widthInput.trim() ? Number(widthInput) : undefined,
      height: heightInput.trim() ? Number(heightInput) : undefined,
    };

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

    setProgressItems(createProgressItems(readyFiles, outputFormat));
    setState({
      isConverting: true,
      error: null,
      successMessage: null,
    });

    try {
      const supabase = getSupabaseBrowserClient();
      const sessionResult = user && supabase
        ? await supabase.auth.getSession()
        : null;
      const accessToken = sessionResult?.data.session?.access_token;
      const conversionBatches = chunkFiles(readyFiles, CLIENT_CONVERSION_BATCH_SIZE);
      const results: ConvertedFile[] = [];
      let firstError: string | null = null;

      for (const batch of conversionBatches) {
        try {
          updateProgressStageForFiles(batch, "uploading", 25);
          updateProgressStageForFiles(batch, "converting", 65);
          const batchResults = await convertFileBatch(
            batch,
            outputFormat,
            activePolicy.retentionMs,
            resolvedOutputOptions,
            accessToken,
          );
          updateProgressStageForFiles(batch, "finalizing", 90);
          await delay(120);
          results.push(...batchResults);
          updateProgressStageForFiles(batch, "done", 100);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Something went wrong while converting. Please try again.";
          firstError ??= message;
          updateProgressStageForFiles(batch, "failed", 100, message);
        }
      }

      setConvertedFiles((currentFiles) => [...results, ...currentFiles]);

      if (results.length) {
        addFilesToHistory(results);
      }

      if (user && results.length) {
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

      if (results.length) {
        await refreshUsageAfterSuccess(results.length);
      }

      const failedCount = readyFiles.length - results.length;
      const hasFailures = failedCount > 0;

      setState({
        isConverting: false,
        error: hasFailures
          ? firstError ?? "Some images could not be converted. You can remove them or try again."
          : null,
        successMessage:
          results.length === 0
            ? null
            : hasFailures
              ? `${results.length} of ${readyFiles.length} images are ready.`
              : results.length === 1
                ? "Your image is ready."
                : "All images are ready.",
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
    const guestUsage = await getSyncedGuestUsage();
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
  const convertDisabled =
    isInitializing ||
    state.isConverting ||
    !selectedFiles.length ||
    limitReached ||
    overLimitCount > 0 ||
    overBatchLimit;
  const hasSelectedFiles = selectedFiles.length > 0;
  const hasFailedProgress = progressItems.some((item) => item.stage === "failed");
  const showProgressList =
    state.isConverting ||
    hasFailedProgress ||
    (progressItems.length > 0 && convertedFiles.length === 0);
  const exceedsLimitMessage =
    overLimitCount > 0 && usage
      ? `${overLimitCount} selected image${overLimitCount === 1 ? "" : "s"} exceed your remaining daily limit. Remove the highlighted file${overLimitCount === 1 ? "" : "s"} or sign in for more room.`
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

      <main className="converter-page" data-tool-kind="image">
        <section className="converter-stage relative overflow-visible px-4 pb-14 pt-10 sm:px-6 sm:pb-18 sm:pt-14">
          <div className="converter-frame mx-auto max-w-7xl">
            <div id="converter" className="converter-spotlight scroll-mt-28">
              <div className="converter-shell card-shadow rounded-[1.5rem] border bg-[var(--card)] p-4 sm:p-6 lg:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
                      <Sparkles className="h-4 w-4" />
                      Convertiva Image
                    </div>
                    <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                      Convert images without the hassle
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      Upload your images, choose your output format, and convert them in a few clicks.
                    </p>
                  </div>
                </div>

                <div className="mt-7 space-y-5">
                  {!hasSelectedFiles ? (
                    <UploadBox
                      onFilesSelected={handleFilesSelected}
                    />
                  ) : null}

                  <div className="space-y-4">
                    {hasSelectedFiles ? (
                      <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-3 sm:p-4">
                        <UploadBox
                          onFilesSelected={handleFilesSelected}
                          compact
                        />
                      </div>
                    ) : null}

                    {showProgressList ? (
                      <ConversionProgressList
                        items={progressItems}
                        onRemove={handleRemoveFile}
                        onDownload={convertedFiles.length ? handleDownloadSingle : undefined}
                      />
                    ) : (
                      <FileList
                        files={selectedFiles}
                        onRemove={handleRemoveFile}
                        onOpenOptions={(trigger) => openOptionsModal(trigger)}
                      />
                    )}

                    <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-3 sm:p-3.5">
                      <div className="grid gap-3 md:grid-cols-2 md:items-start">
                        <div>
                          <FormatSelector value={outputFormat} onChange={setOutputFormat} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            Convert
                          </p>
                          {limitReached && usage?.isGuest ? (
                            <button
                              type="button"
                              onClick={() => openAuthModal("signup")}
                              className="inline-flex w-full justify-center rounded-full border border-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--background-secondary)]"
                            >
                              Sign in for more conversions
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleConvert}
                            disabled={convertDisabled}
                            className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium transition ${
                              convertDisabled
                                ? "cursor-not-allowed border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--muted-foreground)] opacity-70"
                                : "bg-[#3E5F44] text-white hover:bg-[#2F4A35]"
                            }`}
                          >
                            {state.isConverting ? (
                              <>
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Converting...
                              </>
                            ) : !selectedFiles.length ? (
                              "Upload images first"
                            ) : (
                              "Convert images"
                            )}
                          </button>
                          {!hasSelectedFiles ? (
                            <p className="text-left text-xs leading-5 text-[var(--muted-foreground)]">
                              Upload at least one image to start.
                            </p>
                          ) : null}
                          <p className="text-left text-xs leading-5 text-[var(--muted-foreground)]">
                            Up to {activePolicy.maxBatchFiles} images per batch ·{" "}
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

                    </div>

                    <div className="flex gap-3 rounded-[1.25rem] border bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                      <p className="leading-6">
                        Files are processed temporarily. Guest downloads expire after 1 hour.
                        Logged-in history keeps the last 20 conversions for 24 hours.
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
                      onDownloadAll={handleDownloadAll}
                      onRemove={handleRemoveConvertedFile}
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
      {hasSelectedFiles && isOptionsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[color:color-mix(in_srgb,var(--foreground)_35%,transparent)] p-4 animate-[options-fade_180ms_ease-out] sm:items-center"
          onClick={closeOptionsModal}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Advanced conversion options"
            onClick={(event) => event.stopPropagation()}
            className="flex w-full max-w-3xl flex-col overflow-visible rounded-2xl border bg-[var(--card)] shadow-[0_12px_36px_rgba(20,40,30,0.14)] animate-[options-pop_180ms_ease-out]"
          >
            <div className="border-b px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Image options</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    Adjust size, fit, and privacy settings before converting.
                  </p>
                </div>
              <button
                type="button"
                onClick={closeOptionsModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card-muted)] text-[var(--muted-foreground)] transition hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:shadow-none"
                aria-label="Close image options"
              >
                <X className="h-4 w-4" />
              </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  Width (px)
                </span>
                <input
                  ref={optionsFirstFieldRef}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={draftWidthInput}
                  onChange={(event) =>
                    setDraftWidthInput(event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="Auto width"
                  className="min-h-10 w-full rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:outline-none focus-visible:outline-none focus-visible:shadow-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  Height (px)
                </span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={draftHeightInput}
                  onChange={(event) =>
                    setDraftHeightInput(event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="Auto height"
                  className="min-h-10 w-full rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:outline-none focus-visible:outline-none focus-visible:shadow-none"
                />
              </label>
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Leave empty to keep the original size.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  Fit
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFitMenuOpen((current) => !current)}
                    className={`flex min-h-10 w-full items-center justify-between rounded-xl border bg-[var(--card-muted)] px-3 text-left text-sm text-[var(--foreground)] transition ${
                      isFitMenuOpen ? "border-[var(--primary)]" : "border-[var(--border)]"
                    }`}
                    aria-expanded={isFitMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <span>
                      {draftFitMode === "max" ? "Max size" : draftFitMode === "crop" ? "Cover" : "Stretch"}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">▼</span>
                  </button>
                  <div
                    className={`absolute left-0 top-full z-40 mt-1 w-full overflow-hidden rounded-xl border bg-[var(--card)] shadow-lg transition-all duration-180 ease-out ${
                      isFitMenuOpen
                        ? "visible translate-y-0 opacity-100"
                        : "pointer-events-none invisible -translate-y-1 opacity-0"
                    }`}
                    role="listbox"
                    aria-label="Fit mode"
                  >
                    {[
                      { value: "max", label: "Max size" },
                      { value: "crop", label: "Cover" },
                      { value: "scale", label: "Stretch" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setDraftFitMode(option.value as NonNullable<OutputOptions["fitMode"]>);
                          setIsFitMenuOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm transition ${
                          draftFitMode === option.value
                            ? "bg-[var(--background-secondary)] text-[var(--foreground)]"
                            : "text-[var(--foreground)] hover:bg-[var(--card-muted)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {draftFitMode === "max"
                    ? "Max size: Resize within the given width and height."
                    : draftFitMode === "crop"
                      ? "Cover: Fill the size and crop if needed."
                      : "Stretch: Force exact width and height."}
                </p>
              </label>
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  Remove metadata
                </span>
                <div className="flex min-h-10 items-center gap-4 rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)]">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="strip-metadata"
                      checked={draftStripMetadata}
                      onChange={() => setDraftStripMetadata(true)}
                    />
                    Yes
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="strip-metadata"
                      checked={!draftStripMetadata}
                      onChange={() => setDraftStripMetadata(false)}
                    />
                    No
                  </label>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Removes hidden camera, location, and device info.
                </p>
              </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <button
                type="button"
                onClick={resetDraftImageOptions}
                className="rounded-xl border bg-[var(--card)] px-3.5 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyOptionsAndClose}
                className="rounded-xl bg-[#3E5F44] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

