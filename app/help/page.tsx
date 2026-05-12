import { InfoPage } from "@/components/InfoPage";

export default function Page() {
  return (
    <InfoPage
      badge="Help"
      title="Help that matches the Convertiva workflow."
      description="Convertiva is designed to stay simple: pick a tool, upload your file, choose the result, and download it. These notes cover the basics."
      sections={[
        {
          title: "Choosing a tool",
          body: "Use the Converters menu to find the right tool for images, video, audio, documents, archives, websites, and more.",
        },
        {
          title: "Upload limits",
          body: "Each tool validates files before processing and may apply size, count, or format limits based on your current usage level.",
        },
        {
          title: "Temporary processing",
          body: "Files are handled for the job you start and are not meant to stay on the platform longer than needed.",
        },
        {
          title: "If something fails",
          body: "Try a supported file type, reduce the file size, or switch to a more suitable converter before retrying.",
        },
      ]}
    />
  );
}

