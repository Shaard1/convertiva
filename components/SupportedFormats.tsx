import { Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const supportedFormats = [
  "AVIF",
  "BMP",
  "GIF",
  "ICO",
  "JPG",
  "JPEG",
  "JFIF",
  "PNG",
  "TIFF",
  "WEBP",
];

export function SupportedFormats() {
  return (
    <section id="formats" className="soft-section section-fade py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading
          badge="Formats"
          title="Supported image formats"
          description="Convertly Image accepts the formats below for upload and conversion."
        />

        <div className="mx-auto mt-10 rounded-[1.5rem] border bg-[var(--card)] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--background-secondary)] text-[var(--primary)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Common image types are ready
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  Upload any of these formats, then choose the format you want back.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {supportedFormats.map((format) => (
              <div
                key={format}
                className="rounded-xl border border-[var(--primary)]/18 bg-[color-mix(in_srgb,var(--background-secondary)_72%,var(--card))] px-4 py-3 text-center text-sm font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)]"
              >
                {format}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
