export class CapacityExceededError extends Error {
  constructor(resourceName: string) {
    super(`${resourceName} capacity is currently full.`);
    this.name = "CapacityExceededError";
  }
}

export class CapacityLimiter {
  private activeTasks = 0;

  constructor(
    private readonly resourceName: string,
    private readonly maxConcurrency: number,
  ) {
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
      throw new Error("Capacity concurrency must be a positive integer.");
    }
  }

  async run<T>(task: () => Promise<T>) {
    if (this.activeTasks >= this.maxConcurrency) {
      throw new CapacityExceededError(this.resourceName);
    }

    this.activeTasks += 1;

    try {
      return await task();
    } finally {
      this.activeTasks -= 1;
    }
  }
}

export function readConcurrencyLimit(environmentName: string, fallback: number) {
  const value = Number(process.env[environmentName]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
