import { InfoPage } from "@/components/InfoPage";

export default function Page() {
  return (
    <InfoPage
      badge="Privacy policy"
      title="Convertly keeps file handling temporary and focused."
      description="Privacy matters most during upload, processing, and download. Convertly is built around short-lived file handling rather than long-term storage."
      sections={[
        {
          title: "Temporary processing",
          body: "Files are processed for the task you request and are removed after their retention period expires.",
        },
        {
          title: "Usage data",
          body: "Basic usage tracking is used to enforce limits, support signed-in access, and keep the platform stable.",
        },
        {
          title: "Accounts",
          body: "If you sign in, account details are used only for authentication, usage limits, and related platform features.",
        },
        {
          title: "Platform direction",
          body: "As Convertly grows, privacy details can expand, but the default product direction stays clear: process files, then let them go.",
        },
      ]}
    />
  );
}
