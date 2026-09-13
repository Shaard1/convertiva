"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, AudioLines, ChevronDown, FileImage, FileText, Film, ImageIcon, LoaderCircle, Plus } from "lucide-react";
import { CONVERSION_POLICIES, SUPPORTED_INPUT_ACCEPT, SUPPORTED_OUTPUT_FORMATS } from "@/lib/constants";
import { validateFile } from "@/lib/file";
import { stageImageUpload } from "@/lib/pending-image-upload";
import type { OutputFormat } from "@/types/converter";
import styles from "@/components/Home.module.css";

const outputDescriptions: Record<OutputFormat, string> = {
  avif: "Compact images for modern browsers.",
  bmp: "Uncompressed bitmap images.",
  gif: "A familiar format for simple graphics.",
  ico: "Icons for websites and applications.",
  jpg: "A familiar format for photos and sharing.",
  pdf: "An image in a shareable PDF document.",
  png: "Crisp graphics with transparency support.",
  tiff: "Detailed images for print workflows.",
  webp: "Smaller images, made for the web.",
};

export function HomeConverter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("webp");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectFiles(files: File[]) {
    if (!files.length || isPending) return;
    setError(null);
    const maximumPolicy = CONVERSION_POLICIES.authenticated;
    if (files.length > maximumPolicy.maxBatchFiles) {
      setError(`Select ${maximumPolicy.maxBatchFiles} images or fewer. Guest batches support ${CONVERSION_POLICIES.guest.maxBatchFiles} images.`);
      return;
    }
    for (const file of files) {
      const result = validateFile(file, maximumPolicy.maxFileSizeBytes);
      if (!result.isValid) {
        setError(`${file.name}: ${result.error} For other file types, choose a converter from the links above.`);
        return;
      }
    }
    stageImageUpload(files, outputFormat);
    startTransition(() => router.push("/tools/image-converter"));
  }

  return (
    <div className={styles.converter}>
      <nav className={styles.categories} aria-label="Choose a converter">
        <a href="#image-upload" aria-current="location"><FileImage size={18} aria-hidden="true" /> Images</a>
        <Link href="/tools/document-converter" prefetch={false}><FileText size={18} aria-hidden="true" /> Documents</Link>
        <Link href="/tools/video-converter" prefetch={false}><Film size={18} aria-hidden="true" /> Video</Link>
        <Link href="/tools/audio-converter" prefetch={false}><AudioLines size={18} aria-hidden="true" /> Audio</Link>
        <a href="#tools" className={styles.moreTools}>All tools <ArrowUpRight size={16} aria-hidden="true" /></a>
      </nav>
      <div className={styles.workbench}>
        <div id="image-upload" className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`} aria-busy={isPending}
          onDragEnter={(event) => { event.preventDefault(); dragDepth.current += 1; if (event.dataTransfer.types.includes("Files")) setIsDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
          onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setIsDragging(false); }}
          onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setIsDragging(false); selectFiles(Array.from(event.dataTransfer.files)); }}
        >
          <span className={styles.dropzoneLabel}>IMAGE CONVERTER</span>
          <div className={styles.fileIllustration} aria-hidden="true">
            <div className={styles.sourceFile}><ImageIcon size={32} strokeWidth={1.25} /><span>.jpg</span></div>
            <ArrowRight className={styles.conversionArrow} size={26} strokeWidth={1.3} />
            <div className={styles.targetFile}><ImageIcon size={32} strokeWidth={1.25} /><span>.{outputFormat}</span></div>
          </div>
          <h2>{isDragging ? "Drop to choose your images" : "Drop your images here"}</h2>
          <p>JPG, PNG, WEBP, AVIF, TIFF, and more.</p>
          <button className={styles.chooseButton} type="button" disabled={isPending} onClick={() => inputRef.current?.click()}>
            {isPending ? <LoaderCircle size={20} className={styles.spinner} aria-hidden="true" /> : <Plus size={21} aria-hidden="true" />}
            {isPending ? "Opening converter…" : "Choose images"}
          </button>
          <input ref={inputRef} type="file" multiple accept={SUPPORTED_INPUT_ACCEPT} aria-label="Choose images to convert" className="sr-only" tabIndex={-1} onChange={(event) => { selectFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          <p className={styles.uploadHint}>or drag them from your desktop</p>
        </div>
        <aside className={styles.outputPanel} aria-label="Image conversion settings">
          <div>
            <label htmlFor="home-output-format">CONVERT TO</label>
            <div className={styles.selectWrap}>
              <select id="home-output-format" value={outputFormat} disabled={isPending} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}>
                {SUPPORTED_OUTPUT_FORMATS.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}
              </select><ChevronDown size={18} aria-hidden="true" />
            </div>
            <p className={styles.outputDescription}>{outputDescriptions[outputFormat]}</p>
          </div>
          <div className={styles.instructions}>
            <p>THREE SIMPLE STEPS</p>
            <ol><li><span>01</span> Choose your images</li><li><span>02</span> Review your settings</li><li><span>03</span> Convert & download</li></ol>
          </div>
          <p className={styles.localNote}>Your files stay on your device until you press Convert.</p>
        </aside>
      </div>
      {error ? <p className={styles.uploadError} role="alert">{error}</p> : null}
      <div className={styles.benchFoot}>
        <span>For guests: {CONVERSION_POLICIES.guest.maxBatchFiles} images per batch <span aria-hidden="true">·</span> {CONVERSION_POLICIES.guest.maxFileSizeBytes / (1024 * 1024)} MB per image</span>
        <Link href="/tools/image-converter" prefetch={false}>Open full image converter <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
