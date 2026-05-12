import { AudioConverter } from "@/components/AudioConverter";
import { AudioHowItWorks } from "@/components/AudioHowItWorks";
import { AudioSupportedFormats } from "@/components/AudioSupportedFormats";
import { Footer } from "@/components/Footer";

export default function AudioConverterPage() {
  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <AudioConverter />
      <AudioSupportedFormats />
      <AudioHowItWorks />
      <Footer />
    </div>
  );
}
