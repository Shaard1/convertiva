import {
  createApiSuccessResponse,
  handleApiRequest,
} from "@/lib/api/http";
import { listConversionEngines } from "@/lib/conversion-engines";
import { listConversionOperations } from "@/lib/conversion-operations";

export async function GET(request: Request) {
  return handleApiRequest(
    request,
    "list_conversion_operations",
    "Conversion operations could not be loaded.",
    async (context) => {
      const processingMode =
        process.env.CONVERSION_PROCESSING_MODE === "queued"
          ? "queued"
          : "inline";
      const converters = listConversionOperations();

      return createApiSuccessResponse(context, {
        operations: ["convert"],
        processingMode,
        converters,
        outputFormats: Object.fromEntries(
          converters.map((operation) => [
            operation.tool,
            operation.outputFormats,
          ]),
        ),
        engines: listConversionEngines().map((engine) => ({
          ...engine,
          configured:
            engine.implemented &&
            (engine.mode === "inline" || processingMode === "queued"),
        })),
      });
    },
  );
}
