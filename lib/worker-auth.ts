import { timingSafeEqual } from "node:crypto";
import { PublicApiError } from "@/lib/api/http";

function secretsMatch(candidate: string | null, expected: string) {
  if (!candidate) {
    return false;
  }

  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);

  return (
    candidateBytes.byteLength === expectedBytes.byteLength &&
    timingSafeEqual(candidateBytes, expectedBytes)
  );
}

export function isAuthorizedWorkerRequest(request: Request) {
  const workerSecret = process.env.CONVERSION_WORKER_SECRET;

  if (!workerSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-worker-secret");
  const bearerSecret = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  return (
    secretsMatch(bearerSecret, workerSecret) ||
    secretsMatch(headerSecret, workerSecret)
  );
}

export function createWorkerAuthErrorResponse() {
  return Response.json(
    {
      error: "Worker authorization failed.",
    },
    { status: 401 },
  );
}

export function assertAuthorizedWorkerRequest(request: Request) {
  if (!isAuthorizedWorkerRequest(request)) {
    throw new PublicApiError(
      "WORKER_UNAUTHORIZED",
      "Worker authorization failed.",
      401,
    );
  }
}
