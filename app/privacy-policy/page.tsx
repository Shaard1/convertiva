import { Database, FileClock, LockKeyhole } from "lucide-react";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const sections = [
  ["1. Information we process", "When you use Convertiva, we may process files or public website URLs you submit, conversion settings, output files, technical request information, and usage counts. If you create an account, we process your email address, authentication identifiers, and session information. We do not ask you to include personal information inside uploaded files."],
  ["2. Why we process it", "We use this information to perform the conversion you request, validate files, provide downloads, enforce daily and technical limits, maintain account access, prevent abuse, diagnose failures, and protect the reliability and security of the service."],
  ["3. Uploaded files and outputs", "Uploaded files are processed only to complete the requested task. Guest download objects are configured to expire after one hour. For signed-in users, the latest 20 conversion-history items may remain available for up to 24 hours. Convertiva is not permanent file storage; keep your own original and backup copies."],
  ["4. Accounts and authentication", "Account authentication is provided through Supabase when configured. Account records may include your email address, user identifier, login/session data, and daily usage totals. If you use a third-party sign-in provider, that provider also processes information under its own privacy terms."],
  ["5. Local browser data", "Convertiva stores necessary preferences and guest usage counters in your browser, including theme preference and daily guest usage. Authentication may use necessary cookies or browser storage to keep you signed in. We do not describe advertising or profiling cookies because the current application does not implement them."],
  ["6. Logs and security", "Hosting and infrastructure providers may create technical logs such as IP address, browser information, timestamps, requested routes, and error details. These logs are used for delivery, security, rate limiting, abuse prevention, and troubleshooting. Avoid including confidential file contents in support messages."],
  ["7. Service providers", "Convertiva may rely on hosting, database, authentication, and processing providers, including Supabase and the deployment platform selected by the operator. These providers process information to deliver their services and are governed by their own terms and data-protection commitments."],
  ["8. Your choices and rights", "You may use supported guest features without creating an account. You can clear local browser data through your browser controls. Depending on your location, you may have rights to request access, correction, deletion, restriction, portability, or objection concerning personal data associated with your account."],
  ["9. Children", "Convertiva is a general-purpose utility and is not directed to children under 13. Do not use the service to submit children’s personal data without appropriate authority and safeguards."],
  ["10. Changes and contact", "We may update this notice when the service, providers, or legal requirements change. Material updates should be reflected by a revised effective date. For privacy requests, use the Contact page and clearly label the request as a privacy matter."],
] as const satisfies readonly LegalSection[];

const facts = [
  { icon: FileClock, label: "1-hour guest retention" },
  { icon: Database, label: "24-hour account history" },
  { icon: LockKeyhole, label: "Purpose-limited processing" },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      description="This notice explains what Convertiva processes when you upload, convert, download, or sign in."
      effectiveDate="September 6, 2026"
      eyebrow="Privacy policy"
      eyebrowIcon={LockKeyhole}
      facts={facts}
      idPrefix="privacy"
      sections={sections}
      title="Privacy should be understandable."
    />
  );
}
