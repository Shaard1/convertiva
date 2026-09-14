import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Upload } from "lucide-react";
import { ConverterToolIcon } from "@/components/ConverterToolIcon";
import { SectionHeading } from "@/components/SectionHeading";
import { SitePageShell } from "@/components/SitePageShell";
import { getToolById } from "@/lib/tools/converterTools";
import styles from "@/components/ConverterLayout.module.css";
import support from "@/components/ToolSupport.module.css";

type ToolPlaceholderPageProps = {
  toolId: string;
};

const plannedSteps = [
  {
    icon: "upload",
    title: "Upload your file",
    text: "Choose one file or drop it into the upload area.",
  },
  {
    icon: "settings",
    title: "Choose settings",
    text: "Pick the output format and adjust simple options when needed.",
  },
  {
    icon: "download",
    title: "Convert and download",
    text: "Run the conversion and download the finished file when ready.",
  },
];

export function ToolPlaceholderPage({ toolId }: ToolPlaceholderPageProps) {
  const tool = getToolById(toolId);

  if (!tool) {
    return null;
  }

  return (
    <SitePageShell>
      <div className="converter-page" data-tool-kind={tool.section}>
        <section className={styles.stage}>
          <div className="converter-frame mx-auto max-w-7xl">
            <div className={styles.layout}>
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

              <div className={styles.placeholder}>
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--primary)] shadow-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                  Coming soon
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
                  The page is ready, and conversion logic will be added when this tool moves from coming soon to ready.
                </p>
                <Link
                  href="/"
                  className="button-primary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to converters
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="formats" className={`${support.section} soft-section`}>
          <div className="mx-auto max-w-5xl px-6">
            <SectionHeading
              badge="Formats"
              title={`${tool.title} formats`}
              description="These are the format groups planned for this tool."
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

        <section id="how-it-works" className={support.section}>
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              badge="How it works"
              title="A simple flow is planned"
              description="The final tool will follow the same clear Convertiva pattern."
            />
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plannedSteps.map((step, index) => {
                return (
                  <div key={step.title} className="rounded-[1.5rem] border bg-[var(--card)] p-6">
                    <div className="flex items-center gap-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--background-secondary)] text-base font-semibold text-[var(--primary)]">
                        {index + 1}
                      </div>
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[var(--card-muted)] text-[var(--primary)]">
                        {step.icon === "upload" ? <Upload className="h-5 w-5" /> : null}
                        {step.icon === "settings" ? <CheckCircle2 className="h-5 w-5" /> : null}
                        {step.icon === "download" ? (
                          <ConverterToolIcon icon={tool.icon} className="h-5 w-5" />
                        ) : null}
                      </div>
                    </div>
                    <h3 className="mt-6 text-lg font-semibold text-[var(--foreground)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                      {step.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </SitePageShell>
  );
}

