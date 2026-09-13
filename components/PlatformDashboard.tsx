import Link from "next/link";
import type { Route } from "next";
import { ArrowDown, ArrowUpRight, Check, Files, ShieldCheck } from "lucide-react";
import { SitePageShell } from "@/components/SitePageShell";
import { HomeConverter } from "@/components/HomeConverter";
import { ConverterToolIcon } from "@/components/ConverterToolIcon";
import { converterTools } from "@/lib/tools/converterTools";
import styles from "@/components/Home.module.css";

const toolGroups = [
  { title: "Convert", description: "A different format. The same idea.", sections: ["Convert files"] },
  { title: "Compress & combine", description: "Less weight. Everything together.", sections: ["Optimize files", "PDF tools"] },
  { title: "Package & capture", description: "Ready to save, send, or share.", sections: ["Archive tools", "Website tools"] },
];

export function PlatformDashboard() {
  const readyTools = converterTools.filter((tool) => tool.status === "ready");
  return (
    <div className={styles.page}>
      <SitePageShell>
        <div id="main-content" className={styles.content}>
          <section className={styles.hero} aria-labelledby="home-title">
            <div className={styles.intro}>
              <div>
                <p className={styles.eyebrow}><Files size={15} aria-hidden="true" /> THE EVERYDAY FILE TOOLKIT</p>
                <h1 id="home-title">File conversion.<br /><span>Straight to it.</span></h1>
              </div>
              <div className={styles.introAside}>
                <p>Images, documents, video, and audio.<br />Get the format you need and get on with your day.</p>
                <a href="#tools">Find your tool <ArrowDown size={16} aria-hidden="true" /></a>
              </div>
            </div>
            <HomeConverter />
            <div className={styles.assurance}>
              <span><Check size={16} aria-hidden="true" /> No sign-up needed to start</span>
              <span><ShieldCheck size={16} aria-hidden="true" /> Temporary file processing</span>
              <Link href="/privacy-policy" prefetch={false}>How we handle your files <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
          </section>
          <section id="tools" className={styles.directory} aria-labelledby="tools-title">
            <div className={styles.directoryHeading}>
              <div><p className={styles.eyebrow}>THE TOOL DIRECTORY</p><h2 id="tools-title">What’s the file?</h2></div>
              <p>{readyTools.length} tools, one place.<br />Pick exactly what you need.</p>
            </div>
            <div className={styles.toolGroups}>
              {toolGroups.map((group) => (
                <div key={group.title} className={styles.toolGroup}>
                  <h3>{group.title}</h3><p>{group.description}</p>
                  <ul>
                    {readyTools.filter((tool) => group.sections.includes(tool.section)).map((tool) => (
                      <li key={tool.id}>
                        <Link href={tool.route as Route} prefetch={false}>
                          <ConverterToolIcon icon={tool.icon} className={styles.directoryIcon} />
                          <span>{tool.name}</span><ArrowUpRight size={16} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className={styles.directoryFoot}>
              <span>Looking for a particular file extension?</span>
              <Link href="/formats" prefetch={false}>Browse supported formats <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
          </section>
        </div>
      </SitePageShell>
    </div>
  );
}
