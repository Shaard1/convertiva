import { DocumentConverter } from "@/components/DocumentConverter";
import { DocumentHowItWorks } from "@/components/DocumentHowItWorks";
import { DocumentSupportedFormats } from "@/components/DocumentSupportedFormats";
import { Footer } from "@/components/Footer";

export default function DocumentConverterPage() {
  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <DocumentConverter />
      <DocumentSupportedFormats />
      <DocumentHowItWorks />
      <Footer />
    </div>
  );
}
