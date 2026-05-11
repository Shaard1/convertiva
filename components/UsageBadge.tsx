import { UserUsage } from "@/types/usage";

type UsageBadgeProps = {
  usage: UserUsage | null;
};

export function UsageBadge({ usage }: UsageBadgeProps) {
  if (!usage) {
    return null;
  }

  const remaining = Math.max(usage.remaining, 0);
  const label =
    remaining === 1 ? "1 conversion left" : `${remaining} conversions left`;

  return (
    <div
      title={`${usage.label} conversions reset daily. ${usage.conversionsUsed}/${usage.limit} used today.`}
      className="inline-flex min-h-10 items-center rounded-full border border-[var(--primary)]/20 bg-[color-mix(in_srgb,var(--background-secondary)_70%,var(--card))] px-3 py-2 text-xs font-semibold text-[var(--primary-dark)] dark:text-[var(--foreground)] sm:text-sm"
    >
      {label}
    </div>
  );
}
