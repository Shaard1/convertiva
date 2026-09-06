import Link from "next/link";
import { ArrowUpRight, Check, Gauge, Sparkles } from "lucide-react";
import { SitePageShell } from "@/components/SitePageShell";
import { AUTHENTICATED_DAILY_LIMIT, CONVERSION_POLICIES, GUEST_DAILY_LIMIT } from "@/lib/constants";

const plans = [
  { name: "Guest", price: "$0", note: "No account needed", daily: GUEST_DAILY_LIMIT, size: "20 MB", batch: CONVERSION_POLICIES.guest.maxBatchFiles, history: "Downloads available for 1 hour", cta: "Start as guest", href: "/tools/image-converter", featured: false },
  { name: "Convertiva account", price: "$0", note: "Free account", daily: AUTHENTICATED_DAILY_LIMIT, size: "75 MB", batch: CONVERSION_POLICIES.authenticated.maxBatchFiles, history: "Latest 20 conversions for 24 hours", cta: "Create an account", href: "/tools/image-converter", featured: true },
] as const;

export default function PricingPage() {
  return <SitePageShell><section className="editorial-hero pricing-hero"><div className="editorial-wrap"><p className="eyebrow"><Sparkles className="h-4 w-4" /> Clear limits, no surprise bill</p><h1>Useful for free.<br />Roomier with an account.</h1><div className="editorial-hero-foot"><p>Convertiva currently has two free access levels. Your remaining daily conversions are always visible in the navigation.</p><span>No payment details required</span></div></div></section>
    <section className="editorial-section"><div className="editorial-wrap"><div className="pricing-grid">{plans.map((plan) => <article className={`price-card ${plan.featured ? "price-card-featured" : ""}`} key={plan.name}><div><p className="eyebrow">{plan.note}</p><h2>{plan.name}</h2><p className="price">{plan.price}<span>/ forever</span></p></div><div className="price-rule" /><ul><li><Check />{plan.daily} conversions per day</li><li><Check />Up to {plan.size} per image</li><li><Check />Up to {plan.batch} images per batch</li><li><Check />{plan.history}</li></ul><Link href={plan.href} className={plan.featured ? "button-primary" : "button-secondary"}>{plan.cta}<ArrowUpRight className="h-4 w-4" /></Link></article>)}</div><div className="pricing-note"><Gauge className="h-5 w-5" /><div><h2>Built around fair-use limits</h2><p>Some converters have their own technical file-count or format limits. The tool shows those details before you begin. Paid plans are not currently offered.</p></div></div></div></section></SitePageShell>;
}
