import { InfoPage } from "@/components/InfoPage";

export default function Page() {
  return (
    <InfoPage
      badge="Pricing"
      title="Simple room for free use, with more space when you need it."
      description="Convertly is built to be easy to start with and clearer to grow into. Guest use stays fast, and signed-in users get higher limits where supported."
      sections={[
        {
          title: "Guest access",
          body: "Guest users can start converting right away with daily usage limits designed for quick everyday tasks.",
        },
        {
          title: "Signed-in limits",
          body: "Accounts unlock more daily conversions and extra processing room for supported tools without changing the simple Convertly flow.",
        },
        {
          title: "Platform direction",
          body: "As more tools move from soon to ready, pricing details can expand without turning the product into a cluttered dashboard.",
        },
        {
          title: "Clear usage rules",
          body: "Limits are shown inside the interface so you always know how much room is left before you start a conversion.",
        },
      ]}
    />
  );
}
