
"use client";

import { FormatPicker } from "@/components/FormatPicker";
import styles from "@/components/ConverterLayout.module.css";
import { ConversionAvailability } from "@/components/ConversionAvailability";

import { ChangeEvent, DragEvent, RefObject, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  LoaderCircle,
  Music,
  Settings2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { LazyAuthModal as AuthModal } from "@/components/LazyAuthModal";
import { formatFileSize } from "@/lib/format";
import { audioFormatCategories, AudioFormat, supportedAudioAccept } from "@/lib/formats/audioFormats";
import { useAppShellState } from "@/hooks/useAppShellState";

type AudioFile = {
  file: File;
  id: string;
  typeLabel: string;
  durationLabel: string | null;
};

type AudioStatus = "idle" | "converting" | "success" | "failed";

type AudioOptions = {
  quality: "auto" | "low" | "medium" | "high";
  bitrate: "auto" | "96" | "128" | "192" | "256" | "320";
  sampleRate: "auto" | "22050" | "44100" | "48000";
  channels: "auto" | "mono" | "stereo";
  trimStart: string;
  trimEnd: string;
  normalizeVolume: boolean;
};

type ConvertedAudio = {
  fileName: string;
  outputFormat: AudioFormat;
  size: number | null;
  downloadUrl: string | null;
};

const defaultAudioOptions: AudioOptions = {
  quality: "auto",
  bitrate: "auto",
  sampleRate: "auto",
  channels: "auto",
  trimStart: "",
  trimEnd: "",
  normalizeVolume: false,
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.round(seconds % 60).toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds}`;
  }

  return `${minutes}:${remainingSeconds}`;
}

function getAudioTypeLabel(file: File) {
  const match = file.name.match(/\.([^.]+)$/);
  return match ? match[1].toUpperCase() : file.type || "Audio";
}

function isSupportedAudio(file: File) {
  return (
    file.type.startsWith("audio/") ||
    /\.(aac|ac3|aif|aifc|aiff|amr|au|caf|dss|flac|m4a|m4b|mp3|oga|opus|sf2|sfark|voc|wav|weba|wma)$/i.test(
      file.name,
    )
  );
}

async function readAudioDuration(file: File) {
  return new Promise<string | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(formatDuration(audio.duration));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

function buildOutputFileName(fileName: string, outputFormat: AudioFormat) {
  return fileName.replace(/\.[^.]+$/, "") + `.${outputFormat.toLowerCase()}`;
}
export function AudioConverter() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const firstOptionsFieldRef = useRef<HTMLSelectElement | null>(null);
  const {
    authModalOpen,
    authMode,
    closeAuth,
    handleLogout,
    openAuth,
    usage,
    user,
  } = useAppShellState();
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [outputFormat, setOutputFormat] = useState<AudioFormat | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertedAudio | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [options, setOptions] = useState<AudioOptions>(defaultAudioOptions);
  const [draftOptions, setDraftOptions] = useState<AudioOptions>(defaultAudioOptions);

  useEffect(() => {
    if (!isOptionsOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeOptions();
      }
    }

    window.addEventListener("keydown", handleEscape);
    firstOptionsFieldRef.current?.focus();
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOptionsOpen]);

  useEffect(() => {
    return () => {
      if (result?.downloadUrl) {
        URL.revokeObjectURL(result.downloadUrl);
      }
    };
  }, [result]);

  async function selectFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!isSupportedAudio(file)) {
      setStatus("failed");
      setMessage("Unsupported file. Choose a supported audio format.");
      setSelectedAudio(null);
      setResult(null);
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setStatus("failed");
      setMessage("File too large. Try an audio file under 100 MB.");
      setSelectedAudio(null);
      setResult(null);
      return;
    }

    setStatus("idle");
    setMessage(null);
    setResult(null);
    setSelectedAudio({
      file,
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      typeLabel: getAudioTypeLabel(file),
      durationLabel: await readAudioDuration(file),
    });
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void selectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void selectFile(event.dataTransfer.files[0]);
  }

  function openOptions(trigger: HTMLButtonElement) {
    optionsTriggerRef.current = trigger;
    setDraftOptions(options);
    setIsOptionsOpen(true);
  }

  function closeOptions() {
    setIsOptionsOpen(false);
    window.setTimeout(() => optionsTriggerRef.current?.focus(), 0);
  }

  function applyOptions() {
    setOptions(draftOptions);
    closeOptions();
  }

  async function convertAudio() {
    if (!selectedAudio) {
      setStatus("failed");
      setMessage("Upload one audio file to start.");
      return;
    }

    if (!outputFormat) {
      setStatus("failed");
      setMessage("Choose an output format before converting.");
      return;
    }

    if (!usage || usage.remaining <= 0) {
      setStatus("failed");
      setMessage(usage?.isGuest ? "Guest limit reached. Sign in for more room." : "You have reached your daily conversion limit.");
      return;
    }

    setStatus("converting");
    setMessage(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedAudio.file, selectedAudio.file.name);
    formData.append("outputFormat", outputFormat);
    formData.append("options", JSON.stringify(options));

    const response = await fetch("/api/convert-audio", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("failed");
      setMessage(payload?.error ?? "Audio conversion failed. Please try again.");
      return;
    }

    const blob = await response.blob();
    const fileName = decodeURIComponent(
      response.headers.get("x-converted-file-name") ?? buildOutputFileName(selectedAudio.file.name, outputFormat),
    );
    const downloadUrl = URL.createObjectURL(blob);

    setStatus("success");
    setMessage("Your audio is ready.");
    setResult({ fileName, outputFormat, size: blob.size, downloadUrl });
  }

  function resetConverter() {
    setSelectedAudio(null);
    setStatus("idle");
    setMessage(null);
    setResult(null);
  }

  const limitReached = Boolean(usage && usage.remaining <= 0);
  const convertDisabled = status === "converting" || !selectedAudio || !outputFormat || !usage || limitReached;
  return (
    <>
      <Navbar user={user} usage={usage} onOpenAuth={openAuth} onLogout={handleLogout} />
      <main className="converter-page" data-tool-kind="audio">
        <section className={styles.stage}>
          <div className="converter-frame mx-auto max-w-7xl">
            <div className={styles.layout}>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
                  <Music className="h-4 w-4" />
                  Convertiva Audio
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                  Convert audio without the hassle
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  Upload an audio file, choose your output format, and convert it in a few clicks.
                </p>
              </div>

              <div className={styles.workbench}>
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
                    accept={supportedAudioAccept}
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--primary)] shadow-sm">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                    Upload your audio
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    or drop your file here.
                  </p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#3E5F44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
                  >
                    <Music className="h-4 w-4" />
                    Select audio
                  </button>
                </div>

                {selectedAudio ? (
                  <div className="flex flex-col gap-3 rounded-2xl border bg-[var(--card-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--background-secondary)] text-[var(--success)]">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {selectedAudio.file.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {formatFileSize(selectedAudio.file.size)} - {selectedAudio.typeLabel}
                          {selectedAudio.durationLabel ? ` - ${selectedAudio.durationLabel}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        ref={optionsTriggerRef}
                        type="button"
                        onClick={(event) => openOptions(event.currentTarget)}
                        className="inline-flex items-center gap-2 rounded-full border bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                      >
                        <Settings2 className="h-4 w-4" />
                        Options
                      </button>
                      <button
                        type="button"
                        onClick={resetConverter}
                        className="inline-flex items-center gap-2 rounded-full border bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className={styles.settings}>
                  <ConversionAvailability usage={usage} />
                  <p className="mb-4 text-xs text-[var(--muted-foreground)]">One audio file · Up to 100 MB</p>
                  <div className="grid gap-3 md:grid-cols-2 md:items-start">
                    <AudioFormatDropdown value={outputFormat} onChange={setOutputFormat} />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Convert</p>
                      <button
                        type="button"
                        onClick={convertAudio}
                        disabled={convertDisabled}
                        className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium transition ${
                          convertDisabled
                            ? "cursor-not-allowed border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--muted-foreground)] opacity-70"
                            : "bg-[#3E5F44] text-white hover:bg-[#2F4A35]"
                        }`}
                      >
                        {status === "converting" ? (
                          <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Converting audio...
                          </>
                        ) : !selectedAudio ? (
                          "Upload audio first"
                        ) : !outputFormat ? (
                          "Choose format first"
                        ) : (
                          "Convert audio"
                        )}
                      </button>
                      {!selectedAudio ? (
                        <p className="text-left text-xs leading-5 text-[var(--muted-foreground)]">
                          Upload one audio file to start.
                        </p>
                      ) : null}
                      {selectedAudio && !outputFormat ? (
                        <p className="text-left text-xs leading-5 text-[var(--muted-foreground)]">
                          Choose an output format to continue.
                        </p>
                      ) : null}
                      {limitReached ? (
                        <p className="text-left text-xs leading-5 text-[var(--danger)]">
                          {usage?.isGuest ? "Guest limit reached. Sign in for more room." : "You have reached your daily conversion limit."}
                        </p>
                      ) : null}
                      <p className="text-left text-xs leading-5 text-[var(--muted-foreground)]">
                        Longer audio files may take more time to process.
                      </p>
                    </div>
                  </div>
                </div>
                {!selectedAudio && !message ? (
                  <div className="rounded-2xl border bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    No file selected. Add one audio file when you are ready.
                  </div>
                ) : null}

                {message ? (
                  <div
                    role={status === "failed" ? "alert" : "status"}
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
                      Converted file is ready.
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {result.fileName} - {result.outputFormat}
                      {result.size ? ` - ${formatFileSize(result.size)}` : ""}
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      {result.downloadUrl ? (
                        <a
                          href={result.downloadUrl}
                          download={result.fileName}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3E5F44] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={resetConverter}
                        className="rounded-full border bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--primary-dark)]"
                      >
                        Convert another audio
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className={`${styles.runtime} flex gap-3 text-sm text-[var(--muted-foreground)]`}>
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                  <p className="leading-6">
                    Audio files are checked before conversion. Guest limits reset daily.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {authModalOpen ? (
        <AuthModal isOpen mode={authMode} onClose={closeAuth} />
      ) : null}

      {isOptionsOpen ? (
        <AudioOptionsModal
          draftOptions={draftOptions}
          setDraftOptions={setDraftOptions}
          firstFieldRef={firstOptionsFieldRef}
          onClose={closeOptions}
          onDone={applyOptions}
          onReset={() => setDraftOptions(defaultAudioOptions)}
        />
      ) : null}
    </>
  );
}

function AudioFormatDropdown({
  value,
  onChange,
}: {
  value: AudioFormat | null;
  onChange: (format: AudioFormat) => void;
}) {
  return <FormatPicker value={value} onChange={onChange} categories={audioFormatCategories} />;
}

function AudioOptionsModal({
  draftOptions,
  setDraftOptions,
  firstFieldRef,
  onClose,
  onDone,
  onReset,
}: {
  draftOptions: AudioOptions;
  setDraftOptions: (options: AudioOptions) => void;
  firstFieldRef: React.RefObject<HTMLSelectElement | null>;
  onClose: () => void;
  onDone: () => void;
  onReset: () => void;
}) {
  function updateOption<K extends keyof AudioOptions>(key: K, value: AudioOptions[K]) {
    setDraftOptions({ ...draftOptions, [key]: value });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--foreground)_35%,transparent)] p-4 animate-[options-fade_180ms_ease-out]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Audio options"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100svh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-[var(--card)] shadow-[0_12px_36px_rgba(20,40,30,0.14)] animate-[options-pop_180ms_ease-out]"
      >
        <div className="border-b px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Audio options</p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Adjust quality, bitrate, and audio settings before converting.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card-muted)] text-[var(--muted-foreground)] transition hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] focus-visible:shadow-none"
              aria-label="Close audio options"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <OptionSelect
            inputRef={firstFieldRef}
            label="Quality"
            value={draftOptions.quality}
            options={["auto", "low", "medium", "high"]}
            labels={{ auto: "Auto", low: "Low", medium: "Medium", high: "High" }}
            onChange={(value) => updateOption("quality", value as AudioOptions["quality"])}
          />
          <OptionSelect
            label="Bitrate"
            value={draftOptions.bitrate}
            options={["auto", "96", "128", "192", "256", "320"]}
            labels={{ auto: "Auto", "96": "96 kbps", "128": "128 kbps", "192": "192 kbps", "256": "256 kbps", "320": "320 kbps" }}
            onChange={(value) => updateOption("bitrate", value as AudioOptions["bitrate"])}
          />
          <OptionSelect
            label="Sample rate"
            value={draftOptions.sampleRate}
            options={["auto", "22050", "44100", "48000"]}
            labels={{ auto: "Auto", "22050": "22050 Hz", "44100": "44100 Hz", "48000": "48000 Hz" }}
            onChange={(value) => updateOption("sampleRate", value as AudioOptions["sampleRate"])}
          />
          <OptionSelect
            label="Channels"
            value={draftOptions.channels}
            options={["auto", "mono", "stereo"]}
            labels={{ auto: "Auto", mono: "Mono", stereo: "Stereo" }}
            onChange={(value) => updateOption("channels", value as AudioOptions["channels"])}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Start time</span>
              <input
                value={draftOptions.trimStart}
                onChange={(event) => updateOption("trimStart", event.target.value)}
                placeholder="00:00"
                className="min-h-10 w-full rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus-visible:shadow-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">End time</span>
              <input
                value={draftOptions.trimEnd}
                onChange={(event) => updateOption("trimEnd", event.target.value)}
                placeholder="00:30"
                className="min-h-10 w-full rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus-visible:shadow-none"
              />
            </label>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Normalize volume</span>
            <div className="flex min-h-10 items-center gap-4 rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="normalize-volume"
                  checked={draftOptions.normalizeVolume}
                  onChange={() => updateOption("normalizeVolume", true)}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="normalize-volume"
                  checked={!draftOptions.normalizeVolume}
                  onChange={() => updateOption("normalizeVolume", false)}
                />
                No
              </label>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border bg-[var(--card)] px-3.5 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl bg-[#3E5F44] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionSelect({
  label,
  value,
  options,
  labels,
  onChange,
  inputRef,
}: {
  label: string;
  value: string;
  options: string[];
  labels: Record<string, string>;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLSelectElement | null>;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
      <select
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus-visible:shadow-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

