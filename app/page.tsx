import { ConverterCard } from "@/components/ConverterCard";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { HowItWorks } from "@/components/HowItWorks";
import { SectionHeading } from "@/components/SectionHeading";
import { SupportedFormats } from "@/components/SupportedFormats";

export default function HomePage() {
  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <ConverterCard />

      <SupportedFormats />
      <HowItWorks />

      <section className="soft-section section-fade py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-[1.5rem] border bg-[var(--card)] p-6 sm:p-8">
            <SectionHeading
              badge="Why sign up"
              title="More room when you need it"
              description="You can convert as a guest, or sign in when you want a higher daily limit and short-term history."
              center={false}
            />
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border bg-[var(--card-muted)] p-5 text-sm text-[var(--muted-foreground)]">
                Guest users get 15 conversions per day.
              </div>
              <div className="rounded-2xl border bg-[var(--card-muted)] p-5 text-sm text-[var(--muted-foreground)]">
                Logged-in free users get 75 conversions per day.
              </div>
              <div className="rounded-2xl border bg-[var(--card-muted)] p-5 text-sm text-[var(--muted-foreground)]">
                Logged-in users keep their last 20 conversions for 24 hours.
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
      <Footer />
    </div>
  );
}
