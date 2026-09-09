import {
  createApiResponseHeaders,
  handleApiRequest,
} from "@/lib/api/http";
import {
  getWorkerJobInputFile,
} from "@/lib/conversion-jobs";
import { createDownloadHeaders } from "@/lib/tools/routeUtils";
import { assertAuthorizedWorkerRequest } from "@/lib/worker-auth";

type RouteContext = {
  params: Promise<{
    jobId: string;
    fileId: string;
  }>;
};

export const runtime = "nodejs";

function createInputHeaders(file: File) {
  return {
    ...createDownloadHeaders(
      file.name,
      file.type || "application/octet-stream",
    ),
    "X-Input-File-Name": encodeURIComponent(file.name),
  };
}

export async function GET(request: Request, routeContext: RouteContext) {
  return handleApiRequest(
    request,
    "download_worker_input",
    "The worker input could not be downloaded.",
    async (context) => {
      assertAuthorizedWorkerRequest(request);
      const { jobId, fileId } = await routeContext.params;
      const file = await getWorkerJobInputFile(jobId, fileId);

      return new Response(new Uint8Array(await file.arrayBuffer()), {
        headers: createApiResponseHeaders(context, createInputHeaders(file)),
      });
    },
  );
}
