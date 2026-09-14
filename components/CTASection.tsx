export function CTASection() {
  return (
    <section className="section-fade py-10">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-[var(--radius-notice)] border bg-[var(--card-muted)] p-6 text-left">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Ready to convert?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
            Upload your files and get clean converted images in just a few clicks.
          </p>
          <a
            href="#converter"
            className="button-primary mt-5"
          >
            Upload images
          </a>
        </div>
      </div>
    </section>
  );
}
