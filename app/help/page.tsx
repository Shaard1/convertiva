import Link from "next/link";
import { Archive, ArrowUpRight, FileImage, FileText, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SitePageShell } from "@/components/SitePageShell";

const topics = [
  { icon: FileImage, title: "Images and media", text: "Supported formats, image batches, quality options, video presets, and audio settings." },
  { icon: FileText, title: "Documents and PDFs", text: "Document outputs, PDF compression, merging, and spreadsheet conversion." },
  { icon: Archive, title: "Archives and websites", text: "Create, extract, or convert archives—and capture public webpages." },
];
const faqs = [
  ["Why was my file rejected?", "The format may not be supported, the file may exceed the active plan limit, or its contents may not match its extension. Check the message shown beside the upload area."],
  ["Where is my converted file?", "Successful results appear in the same workspace with a download action. Guest links expire after one hour; signed-in history lasts up to 24 hours."],
  ["Why is conversion taking longer?", "Video, large archives, complex documents, and busy webpages need more processing time. Keep the page open until the status changes."],
  ["Can I convert several files?", "Image conversion supports batches. Merge PDF and Create Archive accept multiple files. Other tools currently accept one input at a time."],
] as const satisfies readonly (readonly [question: string, answer: string])[];

export default function HelpPage() { return <SitePageShell><section className="help-hero"><div className="editorial-wrap text-center"><p className="eyebrow"><Search className="h-4 w-4" /> Convertiva help</p><h1>What can we help you finish?</h1><p>Start with a topic or use the answers below to solve common conversion problems.</p></div></section><section className="editorial-section"><div className="editorial-wrap"><div className="help-topics">{topics.map(({ icon: Icon, title, text }) => <article key={title}><Icon className="h-6 w-6" /><h2>{title}</h2><p>{text}</p></article>)}</div><div className="faq-layout"><div><p className="eyebrow">Common questions</p><h2 className="section-title mt-4">Answers without the runaround.</h2></div><FaqAccordion items={faqs} /></div><div className="support-strip"><TriangleAlert className="h-5 w-5" /><div><h2>Still stuck?</h2><p>Include the converter name, input format, file size, and exact error when contacting support. Do not attach confidential files.</p></div><Link href="/contact">Contact support <ArrowUpRight className="h-4 w-4" /></Link></div><div className="privacy-strip"><ShieldCheck className="h-5 w-5" /> Files are processed temporarily and are not intended as permanent cloud storage.</div></div></section></SitePageShell>; }
