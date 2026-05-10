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

      <section className="soft-section section-fade py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-[2rem] border bg-[var(--card)] p-8">
            <SectionHeading
              badge="Why sign up"
              title="Get more conversions with an account."
              description="Use Convertly Image as a guest or sign in to unlock a higher daily conversion limit."
              center={false}
            />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border bg-[var(--card-muted)] p-5 text-sm text-[var(--muted-foreground)]">
                Guest users get 15 conversions per day.
              </div>
              <div className="rounded-3xl border bg-[var(--card-muted)] p-5 text-sm text-[var(--muted-foreground)]">
                Logged-in free users get 75 conversions per day.
              </div>
              <div className="rounded-3xl border bg-[var(--card-muted)] p-5 text-sm text-[var(--muted-foreground)]">
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
