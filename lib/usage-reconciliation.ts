type UsageCountReconciliation = {
  localConversionsUsed: number;
  serverConversionsUsed: number;
  limit: number;
};

export function reconcileUsageCount({
  localConversionsUsed,
  serverConversionsUsed,
  limit,
}: UsageCountReconciliation) {
  const values = [localConversionsUsed, serverConversionsUsed, limit];

  if (
    values.some((value) => !Number.isSafeInteger(value)) ||
    localConversionsUsed < 0 ||
    serverConversionsUsed < 0 ||
    limit < 1
  ) {
    throw new RangeError("Usage counts must be non-negative safe integers.");
  }

  return Math.min(Math.max(localConversionsUsed, serverConversionsUsed), limit);
}
