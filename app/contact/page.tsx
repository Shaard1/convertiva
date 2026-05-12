import { InfoPage } from "@/components/InfoPage";

export default function Page() {
  return (
    <InfoPage
      badge="Contact"
      title="Reach out when you need a clearer answer."
      description="Convertiva is still growing into a fuller tools platform. If you need help, want to report an issue, or have a feature request, this page gives the right starting points."
      sections={[
        {
          title: "Product questions",
          body: "Use this space for questions about supported formats, usage limits, or which converter is the right fit for a task.",
        },
        {
          title: "Bug reports",
          body: "If a file fails unexpectedly, include the tool name, input format, and what you expected to happen.",
        },
        {
          title: "Feature requests",
          body: "Suggestions are most useful when they name the tool, the input type, the output type, and the user problem it should solve.",
        },
        {
          title: "Current contact path",
          body: "Until a dedicated contact workflow is added, product and support contact details can live here as the platform expands.",
        },
      ]}
    />
  );
}

