"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Link2,
  LoaderCircle,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { ConverterToolIcon } from "@/components/ConvertersMegaMenu";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SectionHeading } from "@/components/SectionHeading";
import { useAppShellState } from "@/hooks/useAppShellState";
import { formatFileSize } from "@/lib/format";
import { getToolById } from "@/lib/tools/converterTools";
import { workingToolConfigs } from "@/lib/tools/workingToolConfigs";
import {
  incrementAuthenticatedUsage,
  incrementGuestUsage,
} from "@/lib/usage";

type WorkingToolPageProps = {
  toolId: keyof typeof workingToolConfigs;
};

type ToolStatus = "idle" | "processing" | "success" | "failed";

type ToolResult = {
  fileName: string;
  fileSize: number;
  downloadUrl: string;
};

export function WorkingToolPage({ toolId }: WorkingToolPageProps) {
  const tool = useMemo(() => getToolById(toolId), [toolId]);
  const config = workingToolConfigs[toolId];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    authModalOpen,
    authMode,
    closeAuth,
    handleLogout,
    openAuth,
    setUsage,
    usage,
    user,
  } = useAppShellState();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [outputFormat, setOutputFormat] = useState(
    config.outputFormats?.[0]?.value ?? "",
  );
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<ToolStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    return () => {
      if (result?.downloadUrl) {
        URL.revokeObjectURL(result.downloadUrl);
      }
    };
  }, [result]);

  function resetResultState() {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }

    setStatus("idle");
    setMessage(null);
    setResult(null);
  }

  function selectFiles(files: File[]) {
    if (!files.length) {
      return;
    }

    resetResultState();
    setSelectedFiles(
      config.allowMultiple ? files.slice(0, config.maxFiles ?? files.length) : [files[0]],
    );
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    selectFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFiles(Array.from(event.dataTransfer.files));
  }

  async function updateUsageAfterSuccess() {
    if (user) {
      setUsage(await incrementAuthenticatedUsage(user, 1));
      return;
    }

    setUsage(incrementGuestUsage(1));
  }

  async function handleConvert() {
    if (!tool) {
      return;
    }

    if (!usage || usage.remaining <= 0) {
      setStatus("failed");
      setMessage(usage?.isGuest ? "Guest limit reached. Sign in for more room." : "You have reached your daily conversion limit.");
      return;
    }

    if (config.inputMode === "url" && !websiteUrl.trim()) {
      setStatus("failed");
      setMessage("Enter a website URL to start.");
      return;
    }

    if (config.inputMode !== "url" && !selectedFiles.length) {
      setStatus("failed");
      setMessage(config.idleHelperText);
      return;
    }

    if (config.toolId === "merge-pdf" && selectedFiles.length < 2) {
      setStatus("failed");
      setMessage("Upload at least two PDF files to merge.");
      return;
    }

    if (config.outputFormats?.length && !outputFormat) {
      setStatus("failed");
      setMessage("Choose an output format before converting.");
      return;
    }

    setStatus("processing");
    setMessage(null);

    const formData = new FormData();

    if (config.inputMode === "url") {
      formData.append("url", websiteUrl.trim());
    } else if (config.allowMultiple) {
      selectedFiles.forEach((file) => formData.append("files", file, file.name));
    } else if (selectedFiles[0]) {
      formData.append("file", selectedFiles[0], selectedFiles[0].name);
    }

    if (outputFormat) {
      formData.append("outputFormat", outputFormat);
    }

    const response = await fetch(config.apiRoute, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("failed");
      setMessage(payload?.error ?? "This tool could not finish the job. Please try again.");
      return;
    }

    const blob = await response.blob();
    const fileName = decodeURIComponent(
      response.headers.get("x-converted-file-name") ?? `${tool.id}-result`,
    );
    const downloadUrl = URL.createObjectURL(blob);

    await updateUsageAfterSuccess();
    setStatus("success");
    setMessage("Your file is ready.");
    setResult({
      fileName,
      fileSize: blob.size,
      downloadUrl,
    });
  }

  function clearSelection() {
    setSelectedFiles([]);
    setWebsiteUrl("");
    resetResultState();
  }

  const isConvertDisabled =
    status === "processing" ||
    !usage ||
    usage.remaining <= 0 ||
    (config.inputMode === "url" ? !websiteUrl.trim() : selectedFiles.length === 0);

  if (!tool) {
    return null;
  }

  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <Navbar user={user} usage={usage} onOpenAuth={openAuth} onLogout={handleLogout} />

      <main>
        <section className="relative px-4 pb-14 pt-10 sm:px-6 sm:pb-18 sm:pt-14">
          <div className="mx-auto max-w-4xl">
            <div className="card-shadow rounded-[1.5rem] border bg-[var(--card)] p-4 sm:p-6 lg:p-7">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
                  <ConverterToolIcon icon={tool.icon} className="h-4 w-4" />
                  Convertiva Tools
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                  {tool.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {tool.subtitle}
                </p>
              </div>

              <div className="mt-7 space-y-4">
                {config.inputMode === "url" ? (
                  <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-5">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        Website URL
                      </span>
                      <div className="flex items-center gap-3 rounded-2xl border bg-[var(--card)] px-4 py-3">
                        <Link2 className="h-5 w-5 text-[var(--primary)]" />
                        <input
                          value={websiteUrl}
                          onChange={(event) => {
                            resetResultState();
                            setWebsiteUrl(event.target.value);
                          }}
                          placeholder={config.urlPlaceholder}
                          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                        />
                      </div>
                    </label>
                  </div>
                ) : (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`rounded-[1.5rem] border border-dashed bg-[var(--card-muted)] px-5 py-7 text-center transition ${
                      isDragging ? "border-[var(--primary)] bg-[var(--background-secondary)]" : "border-[var(--primary-soft)]"
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept={config.accept}
                      multiple={config.allowMultiple}
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--primary)] shadow-sm">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                      {config.uploadTitle}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {config.uploadSubtitle}
                    </p>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#3E5F44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
                    >
                      <ConverterToolIcon icon={tool.icon} className="h-4 w-4" />
                      {config.selectButtonLabel}
                    </button>
                  </div>
                )}

                {selectedFiles.length ? (
                  <div className="rounded-2xl border bg-[var(--card-muted)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex items-center gap-2 rounded-full border bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                    {selectedFiles.length > 1 ? (
                      <div className="mt-3 grid gap-2 text-xs text-[var(--muted-foreground)] sm:grid-cols-2">
                        {selectedFiles.map((file) => (
                          <span key={`${file.name}-${file.size}`} className="truncate rounded-xl border bg-[var(--card)] px-3 py-2">
                            {file.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-3 sm:p-3.5">
                  <div className="grid gap-3 md:grid-cols-2 md:items-start">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {config.outputFormats?.length ? "Convert to" : config.inputMode === "url" ? "Website" : "Files"}
                      </p>
                      {config.outputFormats?.length ? (
                        <label className="block">
                          <select
                            value={outputFormat}
                            onChange={(event) => {
                              resetResultState();
                              setOutputFormat(event.target.value);
                            }}
                            className="min-h-[48px] w-full rounded-2xl border bg-[var(--card)] px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                          >
                            {config.outputFormats.map((format) => (
                              <option key={format.value} value={format.value}>
                                {format.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                          {config.idleHelperText}
                        </p>
                      )}
                      {config.outputFormats?.length ? (
                        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                          {config.idleHelperText}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Convert</p>
                      <button
                        type="button"
                        onClick={handleConvert}
                        disabled={isConvertDisabled}
                        className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium transition ${
                          isConvertDisabled
                            ? "cursor-not-allowed border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--muted-foreground)] opacity-70"
                            : "bg-[#3E5F44] text-white hover:bg-[#2F4A35]"
                        }`}
                      >
                        {status === "processing" ? (
                          <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Working...
                          </>
                        ) : (
                          config.convertButtonLabel
                        )}
                      </button>
                      <p className="text-left text-xs leading-5 text-[var(--muted-foreground)]">
                        {config.processingHelperText}
                      </p>
                    </div>
                  </div>
                </div>

                {message ? (
                  <div
                    role={status === "failed" ? "alert" : undefined}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      status === "failed"
                        ? "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                        : "bg-[var(--card-muted)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {status === "failed" ? <TriangleAlert className="mr-2 inline h-4 w-4" /> : null}
                    {message}
                  </div>
                ) : null}

                {status === "success" && result ? (
                  <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-5">
                    <p className="text-base font-semibold text-[var(--foreground)]">
                      {config.resultLabel}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {result.fileName} - {formatFileSize(result.fileSize)}
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <a
                        href={result.downloadUrl}
                        download={result.fileName}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3E5F44] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="rounded-full border bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--primary-dark)]"
                      >
                        Start again
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-3 rounded-[1.25rem] border bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                  <p className="leading-6">
                    Files are checked before processing. Guest limits reset daily.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="formats" className="soft-section section-fade py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-6">
            <SectionHeading
              badge="Formats"
              title={`${tool.title} formats`}
              description="These are the main input or output formats this tool is designed for."
            />
            <div className="mx-auto mt-10 rounded-[1.5rem] border bg-[var(--card)] p-5 sm:p-7">
              <div className="flex flex-wrap gap-2.5">
                {tool.formats.map((format) => (
                  <span
                    key={format}
                    className="rounded-xl border border-[var(--primary)]/18 bg-[color-mix(in_srgb,var(--background-secondary)_72%,var(--card))] px-4 py-3 text-sm font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-fade py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              badge="How it works"
              title={`A simple ${tool.title.toLowerCase()} flow`}
              description="The steps stay clear: upload or enter, process, then download."
            />
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {config.steps.map((step, index) => (
                <div key={step.title} className="rounded-[1.5rem] border bg-[var(--card)] p-6">
                  <div className="flex items-center gap-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--background-secondary)] text-base font-semibold text-[var(--primary)]">
                      {index + 1}
                    </div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[var(--card-muted)] text-[var(--primary)]">
                      <ConverterToolIcon icon={tool.icon} className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-[var(--foreground)]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <AuthModal isOpen={authModalOpen} mode={authMode} onClose={closeAuth} />
    </div>
  );
}

