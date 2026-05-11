export function CTASection() {
  return (
    <section className="section-fade py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="card-shadow rounded-[1.5rem] border bg-[var(--card)] px-6 py-10 text-center sm:px-12 sm:py-12">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Ready to convert?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
            Upload your files and get clean converted images in just a few clicks.
          </p>
          <a
            href="#converter"
            className="mt-8 inline-flex rounded-full bg-[#3E5F44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35]"
          >
            Upload images
          </a>
        </div>
      </div>
    </section>
  );
}
