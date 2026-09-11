const DEVELOPMENT_FALLBACK_WINDOW_MS = 30_000;

let fallbackExpiresAt = 0;

export function activateDevelopmentServiceFallback() {
  if (process.env.NODE_ENV !== "production") {
    fallbackExpiresAt = Date.now() + DEVELOPMENT_FALLBACK_WINDOW_MS;
  }
}

export function isDevelopmentServiceFallbackActive() {
  return (
    process.env.NODE_ENV !== "production" && Date.now() < fallbackExpiresAt
  );
}
