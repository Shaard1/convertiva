import { InfoPage } from "@/components/InfoPage";

export default function Page() {
  return (
    <InfoPage
      badge="Terms"
      title="Use Convertly for supported, everyday file tasks."
      description="These terms are presented in plain language for the current platform stage and can grow with the product as more tools become available."
      sections={[
        {
          title: "Supported use",
          body: "Use Convertly with supported file types, public website inputs where allowed, and normal conversion workflows.",
        },
        {
          title: "Limits",
          body: "Guest and signed-in usage can differ. The interface shows what is available before a conversion starts.",
        },
        {
          title: "Availability",
          body: "Some tools are ready today, while others are still marked Soon until their processing engines are in place.",
        },
        {
          title: "Responsibility",
          body: "Make sure you have the right to upload, convert, compress, merge, or export the files you use on the platform.",
        },
      ]}
    />
  );
}
