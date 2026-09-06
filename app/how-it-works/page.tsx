import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Download, FileSearch, LockKeyhole, Settings2, Upload } from "lucide-react";
import { SitePageShell } from "@/components/SitePageShell";

const steps = [
  { icon: FileSearch, title: "Choose the right tool", text: "Start with the job—not a technical setting. Pick image, video, audio, document, archive, PDF, compression, or website tools." },
  { icon: Upload, title: "Add your input", text: "Select a file, a supported batch, or a public website URL. Convertiva validates the input before processing begins." },
  { icon: Settings2, title: "Choose the result", text: "Select an output format and, where useful, adjust image dimensions, video presets, audio quality, or document options." },
  { icon: CheckCircle2, title: "Process with feedback", text: "The workspace shows waiting, processing, success, and error states so you always know what is happening." },
  { icon: Download, title: "Download and move on", text: "Download one result or a batch ZIP. Guest downloads expire after one hour; signed-in history is retained for up to 24 hours." },
];

export default function HowItWorksPage() {
  return <SitePageShell>
    <section className="editorial-hero"><div className="editorial-wrap"><p className="eyebrow">How Convertiva works</p><h1>From source file to useful result.</h1><div className="editorial-hero-foot"><p>Every tool follows the same understandable rhythm, with controls that adapt to the type of file you are working with.</p><Link href="/tools/image-converter" className="button-primary">Try the workflow <ArrowUpRight className="h-4 w-4" /></Link></div></div></section>
    <section className="editorial-section"><div className="editorial-wrap"><div className="process-list">{steps.map(({ icon: Icon, title, text }, index) => <article className="process-row" key={title}><span className="process-number">0{index + 1}</span><span className="process-icon"><Icon className="h-5 w-5" /></span><div><h2>{title}</h2><p>{text}</p></div></article>)}</div></div></section>
    <section className="editorial-section editorial-tint"><div className="editorial-wrap"><div className="section-intro"><div><p className="eyebrow"><LockKeyhole className="h-4 w-4" /> What happens to files</p><h2 className="section-title mt-4">Processed for the job. Kept only as needed.</h2></div><div className="max-w-md space-y-4 text-sm leading-7 text-[var(--muted-foreground)]"><p>Uploads are used to perform the conversion you request. The interface limits file size and batch count before processing.</p><p>Guest downloads expire after one hour. Signed-in history keeps the latest 20 conversions for up to 24 hours.</p></div></div></div></section>
  </SitePageShell>;
}
