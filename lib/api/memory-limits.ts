export type FixedWindowRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type FixedWindowRecord = {
  requestCount: number;
  windowStartedAt: number;
};

type DailyUsageRecord = {
  conversionsReserved: number;
  date: string;
};

export class MemoryApiLimits {
  private readonly dailyUsage = new Map<string, DailyUsageRecord>();
  private readonly rateLimits = new Map<string, FixedWindowRecord>();

  consumeRateLimit(options: {
    identityKey: string;
    limit: number;
    now: number;
    windowMs: number;
  }): FixedWindowRateLimitResult {
    const { identityKey, limit, now, windowMs } = options;
    const current = this.rateLimits.get(identityKey);

    if (!current || now - current.windowStartedAt >= windowMs) {
      this.rateLimits.set(identityKey, {
        requestCount: 1,
        windowStartedAt: now,
      });

      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
        resetAt: now + windowMs,
      };
    }

    current.requestCount += 1;
    return {
      allowed: current.requestCount <= limit,
      limit,
      remaining: Math.max(0, limit - current.requestCount),
      resetAt: current.windowStartedAt + windowMs,
    };
  }

  reserveDailyUsage(options: {
    count: number;
    date: string;
    identityKey: string;
    limit: number;
  }) {
    const { count, date, identityKey, limit } = options;
    const current = this.dailyUsage.get(identityKey);
    const conversionsReserved = current?.date === date
      ? current.conversionsReserved
      : 0;
    const isAllowed = conversionsReserved + count <= limit;

    if (isAllowed) {
      this.dailyUsage.set(identityKey, {
        date,
        conversionsReserved: conversionsReserved + count,
      });
    }

    return {
      allowed: isAllowed,
      remaining: Math.max(0, limit - conversionsReserved - (isAllowed ? count : 0)),
    };
  }

  releaseDailyUsage(options: {
    count: number;
    date: string;
    identityKey: string;
  }) {
    const { count, date, identityKey } = options;
    const current = this.dailyUsage.get(identityKey);

    if (current?.date === date) {
      current.conversionsReserved = Math.max(
        0,
        current.conversionsReserved - count,
      );
    }
  }
}
