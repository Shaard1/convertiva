export function isAuthorizedWorkerRequest(request: Request) {
  const workerSecret = process.env.CONVERSION_WORKER_SECRET;

  if (!workerSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-worker-secret");

  return (
    authorization === `Bearer ${workerSecret}` ||
    headerSecret === workerSecret
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
