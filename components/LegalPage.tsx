import type { LucideIcon } from "lucide-react";
import { SitePageShell } from "@/components/SitePageShell";

export type LegalSection = readonly [title: string, body: string];

type LegalFact = {
  icon: LucideIcon;
  label: string;
};

type LegalPageProps = {
  description: string;
  effectiveDate: string;
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  facts?: readonly LegalFact[];
  idPrefix: string;
  sections: readonly LegalSection[];
  title: string;
};

function sectionId(prefix: string, title: string) {
  const number = title.match(/^\d+/)?.[0] ?? title;
  return `${prefix}-${number}`;
}

export function LegalPage({
  description,
  effectiveDate,
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  facts = [],
  idPrefix,
  sections,
  title,
}: LegalPageProps) {
  return (
    <SitePageShell>
      <section className="legal-hero">
        <div className="editorial-wrap">
          <p className="eyebrow">
            <EyebrowIcon className="h-4 w-4" /> {eyebrow}
          </p>
          <h1>{title}</h1>
          <p>{description}</p>
          {facts.length > 0 && (
            <div className="legal-facts">
              {facts.map(({ icon: Icon, label }) => (
                <span key={label}>
                  <Icon />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="legal-body">
        <div className="legal-wrap">
          <aside>
            <p>Effective {effectiveDate}</p>
            <nav aria-label={`${eyebrow} contents`}>
              {sections.map(([sectionTitle]) => (
                <a href={`#${sectionId(idPrefix, sectionTitle)}`} key={sectionTitle}>
                  {sectionTitle}
                </a>
              ))}
            </nav>
          </aside>
          <div className="legal-sections">
            {sections.map(([sectionTitle, body]) => (
              <section id={sectionId(idPrefix, sectionTitle)} key={sectionTitle}>
                <h2>{sectionTitle}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </SitePageShell>
  );
}
