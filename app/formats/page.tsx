import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Check, CircleDashed, Layers3 } from "lucide-react";
import { SitePageShell } from "@/components/SitePageShell";
import { ConverterToolIcon } from "@/components/ConvertersMegaMenu";
import { converterToolSections, getToolsBySection } from "@/lib/tools/converterTools";

export default function FormatsPage() {
  const readyCount = converterToolSections.flatMap(getToolsBySection).filter((tool) => tool.status === "ready").length;
  return <SitePageShell>
    <section className="editorial-hero"><div className="editorial-wrap"><p className="eyebrow"><Layers3 className="h-4 w-4" /> Format directory</p><h1>Find the right path for every file.</h1><div className="editorial-hero-foot"><p>Browse Convertiva’s available converters by task. Ready tools open directly; planned formats are clearly marked.</p><span>{readyCount} tools available now</span></div></div></section>
    <section className="editorial-section"><div className="editorial-wrap space-y-16">{converterToolSections.map((section, sectionIndex) => <div className="format-group" key={section}><div className="format-group-title"><span>0{sectionIndex + 1}</span><h2>{section}</h2></div><div className="format-directory">{getToolsBySection(section).map((tool) => { const ready = tool.status === "ready"; const content = <><div className="format-card-top"><span className="tool-icon"><ConverterToolIcon icon={tool.icon} className="h-5 w-5" /></span>{ready ? <Check className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}</div><div><p className="text-lg font-semibold">{tool.name}</p><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{tool.subtitle}</p><div className="mt-5 flex flex-wrap gap-2">{tool.formats.map((format) => <span className="format-chip" key={format}>{format}</span>)}</div></div>{ready ? <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Open converter <ArrowUpRight className="h-4 w-4" /></span> : <span className="mt-6 text-xs font-semibold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Coming soon</span>}</>;
          return ready ? <Link href={tool.route as Route} className="format-card" key={tool.id}>{content}</Link> : <article className="format-card format-card-muted" key={tool.id}>{content}</article>; })}</div></div>)}</div></section>
  </SitePageShell>;
}
