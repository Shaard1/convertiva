"use client";

import { ChangeEvent, DragEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  LoaderCircle,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Navbar } from "@/components/Navbar";
import { signOutUser } from "@/lib/auth";
import { formatFileSize } from "@/lib/format";
import { getAuthenticatedUsage, getGuestUsage } from "@/lib/usage";
import {
  documentFormatCategories,
  DocumentFormat,
  supportedDocumentAccept,
} from "@/lib/formats/documentFormats";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { AuthUser } from "@/types/auth";
import { UserUsage } from "@/types/usage";

type DocumentFile = {
  file: File;
  id: string;
  typeLabel: string;
};

type DocumentStatus = "idle" | "converting" | "success" | "failed";

type DocumentOptions = {
  pageSize: "auto" | "a4" | "letter" | "legal";
  orientation: "auto" | "portrait" | "landscape";
  margin: "default" | "narrow" | "wide";
  keepFormatting: boolean;
  convertImages: boolean;
  ocrScannedPages: "off" | "auto";
};

const defaultDocumentOptions: DocumentOptions = {
  pageSize: "auto",
  orientation: "auto",
  margin: "default",
  keepFormatting: true,
  convertImages: true,
  ocrScannedPages: "off",
};

function mapSupabaseUser(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
  };
}

function getDocumentTypeLabel(file: File) {
  const match = file.name.match(/\.([^.]+)$/);
  return match ? match[1].toUpperCase() : "Document";
}

function isSupportedDocument(file: File) {
  return /\.(abw|djvu|doc|docm|docx|dot|dotx|html|hwp|hwpx|lwp|md|odt|pages|pdf|rst|rtf|sdw|tex|txt|wpd|wps|zabw)$/i.test(
    file.name,
  );
}

export function DocumentConverter() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const firstOptionsFieldRef = useRef<HTMLSelectElement | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  const [outputFormat, setOutputFormat] = useState<DocumentFormat>("PDF");
  const [status, setStatus] = useState<DocumentStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [options, setOptions] = useState<DocumentOptions>(defaultDocumentOptions);
  const [draftOptions, setDraftOptions] = useState<DocumentOptions>(defaultDocumentOptions);

  useEffect(() => {
    const guestUsage = getGuestUsage();
    setUsage(guestUsage);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      const authUser = mapSupabaseUser(data.session);
      setUser(authUser);
      if (authUser) {
        getAuthenticatedUsage(authUser)
          .then(setUsage)
          .catch(() => setUsage(guestUsage));
      }
    });

    const listener = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session) => {
        const authUser = mapSupabaseUser(session);
        setUser(authUser);
        if (!authUser) {
          setUsage(getGuestUsage());
          return;
        }
        try {
          setUsage(await getAuthenticatedUsage(authUser));
        } catch {
          setUsage(guestUsage);
        }
      },
    );

    return () => {
      isMounted = false;
      listener.data.subscription.unsubscribe();
    };
  }, []);

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

  async function handleLogout() {
    await signOutUser();
    setUser(null);
    setUsage(getGuestUsage());
  }

  function openAuth(mode: "login" | "signup") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  function selectFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!isSupportedDocument(file)) {
      setStatus("failed");
      setMessage("Unsupported file. Choose a supported document format.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setStatus("failed");
      setMessage("File too large. Try a document under 50 MB.");
      return;
    }

    setStatus("idle");
    setMessage(null);
    setSelectedDocument({
      file,
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      typeLabel: getDocumentTypeLabel(file),
    });
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
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

  async function convertDocument() {
    if (!selectedDocument) {
      setStatus("failed");
      setMessage("Upload one document to start.");
      return;
    }

    if (!usage || usage.remaining <= 0) {
      setStatus("failed");
      setMessage("Guest limit reached. Sign in for more room.");
      return;
    }

    setStatus("converting");
    setMessage(null);

    const formData = new FormData();
    formData.append("file", selectedDocument.file, selectedDocument.file.name);
    formData.append("outputFormat", outputFormat);
    formData.append("options", JSON.stringify(options));

    const response = await fetch("/api/convert-document", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setStatus("failed");
      setMessage(payload?.error ?? "Document conversion failed. Please try again.");
      return;
    }

    setStatus("success");
    setMessage("Your document is ready.");
  }

  const convertDisabled =
    status === "converting" || !selectedDocument || !usage || usage.remaining <= 0;

  return (
    <>
      <Navbar user={user} usage={usage} onOpenAuth={openAuth} onLogout={handleLogout} />
      <main>
        <section className="relative px-4 pb-14 pt-10 sm:px-6 sm:pb-18 sm:pt-14">
          <div className="mx-auto max-w-4xl">
            <div className="card-shadow rounded-[1.5rem] border bg-[var(--card)] p-4 sm:p-6 lg:p-7">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
                  <FileText className="h-4 w-4" />
                  Convertly Document
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                  Convert documents without the hassle
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  Upload a document, choose your output format, and convert it in a few clicks.
                </p>
              </div>

              <div className="mt-7 space-y-4">
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
                    accept={supportedDocumentAccept}
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--primary)] shadow-sm">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                    Upload your document
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    or drop your file here.
                  </p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#3E5F44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
                  >
                    <FileText className="h-4 w-4" />
                    Select document
                  </button>
                </div>

                {selectedDocument ? (
                  <div className="flex flex-col gap-3 rounded-2xl border bg-[var(--card-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--background-secondary)] text-[var(--success)]">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {selectedDocument.file.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {formatFileSize(selectedDocument.file.size)} - {selectedDocument.typeLabel}
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
                        onClick={() => {
                          setSelectedDocument(null);
                          setStatus("idle");
                          setMessage(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-3 sm:p-3.5">
                  <div className="grid gap-3 md:grid-cols-2 md:items-start">
                    <DocumentFormatDropdown value={outputFormat} onChange={setOutputFormat} />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Convert</p>
                      <button
                        type="button"
                        onClick={convertDocument}
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
                            Converting document...
                          </>
                        ) : selectedDocument ? (
                          "Convert document"
                        ) : (
                          "Upload document first"
                        )}
                      </button>
                      {!selectedDocument ? (
                        <p className="text-left text-xs leading-5 text-[var(--muted-foreground)]">
                          Upload one document to start.
                        </p>
                      ) : null}
                      <p className="text-left text-xs leading-5 text-[var(--muted-foreground)]">
                        Some formats may take longer to process.
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
                    {status === "failed" ? (
                      <TriangleAlert className="mr-2 inline h-4 w-4" />
                    ) : null}
                    {message}
                  </div>
                ) : null}

                {status === "success" && selectedDocument ? (
                  <div className="rounded-[1.5rem] border bg-[var(--card-muted)] p-5">
                    <p className="text-base font-semibold text-[var(--foreground)]">
                      Converted file is ready.
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {selectedDocument.file.name} - {outputFormat}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus("idle");
                        setMessage(null);
                        setSelectedDocument(null);
                      }}
                      className="mt-4 rounded-full border bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--primary-dark)]"
                    >
                      Convert another document
                    </button>
                  </div>
                ) : null}

                <div className="flex gap-3 rounded-[1.25rem] border bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                  <p className="leading-6">
                    Document files are checked before conversion. Guest limits reset daily.
                  </p>
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

      {isOptionsOpen ? (
        <DocumentOptionsModal
          draftOptions={draftOptions}
          setDraftOptions={setDraftOptions}
          firstFieldRef={firstOptionsFieldRef}
          onClose={closeOptions}
          onDone={applyOptions}
          onReset={() => setDraftOptions(defaultDocumentOptions)}
        />
      ) : null}
    </>
  );
}

function DocumentFormatDropdown({
  value,
  onChange,
}: {
  value: DocumentFormat;
  onChange: (format: DocumentFormat) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(documentFormatCategories[0].label);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const activeFormats = useMemo(() => {
    const category =
      documentFormatCategories.find((item) => item.label === activeCategory) ??
      documentFormatCategories[0];
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return category.formats;
    }

    return category.formats.filter((format) =>
      format.toLowerCase().includes(normalizedQuery),
    );
  }, [activeCategory, query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="w-full" ref={rootRef}>
      <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Convert to</p>
      <div className="relative">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className={`flex min-h-[48px] w-full items-center justify-between border bg-[var(--card)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] ${
            isOpen ? "rounded-t-2xl rounded-b-none border-[var(--primary)]" : "rounded-2xl"
          }`}
        >
          {value}
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </button>
        <div
          className={`absolute left-0 top-full z-40 w-full overflow-hidden rounded-b-2xl border border-[var(--primary)] border-t-0 bg-[var(--card)] shadow-xl transition-all duration-180 ease-out ${
            isOpen ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"
          }`}
        >
          <div className="border-b px-3 py-2">
            <div className="flex h-9 items-center gap-2 rounded-md border border-transparent bg-transparent px-2 transition-colors hover:bg-[var(--card-muted)] focus-within:border-[var(--border)] focus-within:bg-[var(--card-muted)]">
              <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search format"
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:shadow-none"
              />
            </div>
          </div>
          <div className="grid min-h-56 grid-cols-[10rem_minmax(0,1fr)]">
            <div className="border-r bg-[var(--card-muted)] py-2 text-sm">
              {documentFormatCategories.map((category) => (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => setActiveCategory(category.label)}
                  className={`block w-full px-3 py-1.5 text-left font-semibold transition ${
                    activeCategory === category.label
                      ? "bg-[var(--background-secondary)] text-[var(--foreground)]"
                      : "text-[var(--foreground)] hover:bg-[var(--background-secondary)]"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="space-y-3 p-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                {activeCategory} formats
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activeFormats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => {
                      onChange(format);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      value === format
                        ? "border-[var(--primary)] bg-[var(--background-secondary)] text-[var(--primary-dark)]"
                        : "border-[var(--border)] bg-[var(--card-muted)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--background-secondary)]"
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
              {!activeFormats.length ? (
                <p className="rounded-xl border bg-[var(--card-muted)] px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">
                  No matching format.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentOptionsModal({
  draftOptions,
  setDraftOptions,
  firstFieldRef,
  onClose,
  onDone,
  onReset,
}: {
  draftOptions: DocumentOptions;
  setDraftOptions: (options: DocumentOptions) => void;
  firstFieldRef: React.RefObject<HTMLSelectElement | null>;
  onClose: () => void;
  onDone: () => void;
  onReset: () => void;
}) {
  function updateOption<K extends keyof DocumentOptions>(key: K, value: DocumentOptions[K]) {
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
        aria-label="Document options"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-[var(--card)] shadow-[0_12px_36px_rgba(20,40,30,0.14)] animate-[options-pop_180ms_ease-out]"
      >
        <div className="border-b px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Document options</p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Adjust document output settings before converting.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card-muted)] text-[var(--muted-foreground)] transition hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:shadow-none"
              aria-label="Close document options"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <OptionSelect
            inputRef={firstFieldRef}
            label="Page size"
            value={draftOptions.pageSize}
            options={["auto", "a4", "letter", "legal"]}
            labels={{ auto: "Auto", a4: "A4", letter: "Letter", legal: "Legal" }}
            onChange={(value) => updateOption("pageSize", value as DocumentOptions["pageSize"])}
          />
          <OptionSelect
            label="Orientation"
            value={draftOptions.orientation}
            options={["auto", "portrait", "landscape"]}
            labels={{ auto: "Auto", portrait: "Portrait", landscape: "Landscape" }}
            onChange={(value) => updateOption("orientation", value as DocumentOptions["orientation"])}
          />
          <OptionSelect
            label="Margin"
            value={draftOptions.margin}
            options={["default", "narrow", "wide"]}
            labels={{ default: "Default", narrow: "Narrow", wide: "Wide" }}
            onChange={(value) => updateOption("margin", value as DocumentOptions["margin"])}
          />
          <OptionSelect
            label="OCR scanned pages"
            value={draftOptions.ocrScannedPages}
            options={["off", "auto"]}
            labels={{ off: "Off", auto: "Auto" }}
            onChange={(value) => updateOption("ocrScannedPages", value as DocumentOptions["ocrScannedPages"])}
          />
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Keep formatting</span>
            <div className="flex min-h-10 items-center gap-4 rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="keep-formatting"
                  checked={draftOptions.keepFormatting}
                  onChange={() => updateOption("keepFormatting", true)}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="keep-formatting"
                  checked={!draftOptions.keepFormatting}
                  onChange={() => updateOption("keepFormatting", false)}
                />
                No
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Convert images</span>
            <div className="flex min-h-10 items-center gap-4 rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="convert-images"
                  checked={draftOptions.convertImages}
                  onChange={() => updateOption("convertImages", true)}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="convert-images"
                  checked={!draftOptions.convertImages}
                  onChange={() => updateOption("convertImages", false)}
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
        className="min-h-10 w-full rounded-xl border bg-[var(--card-muted)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus-visible:outline-none focus-visible:shadow-none"
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
