import { Download, Music, SlidersHorizontal } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const steps = [
  {
    icon: Music,
    title: "Upload your audio",
    description: "Choose one audio file or drag it into the upload area.",
  },
  {
    icon: SlidersHorizontal,
    title: "Choose format and options",
    description: "Pick the output format and adjust quality, bitrate, trim, or volume settings when needed.",
  },
  {
    icon: Download,
    title: "Convert and download",
    description: "Start the conversion, then download the finished audio file when it is ready.",
  },
];

export function AudioHowItWorks() {
  return (
    <section id="how-it-works" className="section-fade py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          badge="How it works"
          title="A simple audio conversion flow"
          description="The audio converter keeps the steps clear: upload, choose, convert."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="rounded-[1.5rem] border bg-[var(--card)] p-6 transition duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--background-secondary)] text-base font-semibold text-[var(--primary)]">
                    {index + 1}
                  </div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[var(--card-muted)] text-[var(--primary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-[var(--foreground)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
