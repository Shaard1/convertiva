import { Download, ImageUp, SlidersHorizontal } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const steps = [
  {
    icon: ImageUp,
    title: "Upload your images",
    description: "Drag in one image or a small batch. The app checks each file before converting.",
  },
  {
    icon: SlidersHorizontal,
    title: "Choose output format",
    description: "Pick the image type you want back. The same choice applies to every selected file.",
  },
  {
    icon: Download,
    title: "Convert and download",
    description: "Download each image, or grab the whole batch as one ZIP file.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-fade py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          badge="How it works"
          title="A simple three-step conversion flow"
          description="The experience stays focused on one job: upload, convert, and download without extra noise."
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
