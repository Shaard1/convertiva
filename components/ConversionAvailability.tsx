import type { UserUsage } from "@/types/usage";

/** Presentation only: callers retain all validation and quota enforcement. */
export function ConversionAvailability({ usage }: { usage: UserUsage | null }) {
  if (!usage) return <p role="status" className="form-notice">Checking conversion allowance…</p>;
  if (usage.remaining > 0) return null;
  return <p role="status" className="form-notice">Daily conversion limit reached. {usage.isGuest ? "Sign in for more room, or return after the daily reset." : "Return after the daily reset."}</p>;
}
