import { VideoConverter } from "@/components/VideoConverter";
import { Footer } from "@/components/Footer";
import { VideoHowItWorks } from "@/components/VideoHowItWorks";
import { VideoSupportedFormats } from "@/components/VideoSupportedFormats";

export default function VideoConverterPage() {
  return (
    <div className="page-shell min-h-screen text-[var(--foreground)]">
      <VideoConverter />
      <VideoSupportedFormats />
      <VideoHowItWorks />
      <Footer />
    </div>
  );
}
