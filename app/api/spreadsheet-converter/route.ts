import { parse } from "node:path";
import * as XLSX from "xlsx";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  decodeFormString,
  getFileExtension,
  hasFileExtension,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_SPREADSHEET_BYTES = 25 * 1024 * 1024;
const supportedFormats = ["xlsx", "xls", "csv", "tsv", "ods"] as const;

type SpreadsheetFormat = (typeof supportedFormats)[number];

const formatLabels: Record<SpreadsheetFormat, string> = {
  xlsx: "XLSX",
  xls: "XLS",
  csv: "CSV",
  tsv: "TSV",
  ods: "ODS",
};

const contentTypes: Record<SpreadsheetFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv; charset=utf-8",
  tsv: "text/tab-separated-values; charset=utf-8",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
};

function isSpreadsheetFormat(value: string): value is SpreadsheetFormat {
  return supportedFormats.includes(value as SpreadsheetFormat);
}

function buildOutputFileName(fileName: string, outputFormat: SpreadsheetFormat) {
  const baseName = parse(fileName).name || "converted-spreadsheet";
  return `${baseName}.${outputFormat}`;
}

function buildWorkbookOutput(
  workbook: XLSX.WorkBook,
  outputFormat: SpreadsheetFormat,
) {
  if (outputFormat === "csv" || outputFormat === "tsv") {
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("NO_SHEETS");
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    const text = XLSX.utils.sheet_to_csv(firstSheet, {
      FS: outputFormat === "tsv" ? "\t" : ",",
    });

    return Buffer.from(text, "utf8");
  }

  const bookType = outputFormat === "xls" ? "biff8" : outputFormat;
  return XLSX.write(workbook, { type: "buffer", bookType });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const outputFormatValue = decodeFormString(formData.get("outputFormat")).toLowerCase();

  if (!(file instanceof File)) {
    return buildToolErrorResponse("Upload one spreadsheet file to convert.");
  }

  if (!hasFileExtension(file.name, [...supportedFormats])) {
    return buildToolErrorResponse("Use an XLSX, XLS, CSV, TSV, or ODS file.");
  }

  if (!isSpreadsheetFormat(outputFormatValue)) {
    return buildToolErrorResponse("Choose XLSX, XLS, CSV, TSV, or ODS as the output format.");
  }

  if (file.size > MAX_SPREADSHEET_BYTES) {
    return buildToolErrorResponse("The spreadsheet must be under 25 MB.", 413);
  }

  try {
    const inputExtension = getFileExtension(file.name);
    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), {
      type: "buffer",
      dense: true,
      FS: inputExtension === "tsv" ? "\t" : ",",
    });

    if (!workbook.SheetNames.length) {
      return buildToolErrorResponse("The spreadsheet does not contain any sheets.");
    }

    const outputBuffer = buildWorkbookOutput(workbook, outputFormatValue);
    const outputFileName = buildOutputFileName(file.name, outputFormatValue);

    return new Response(new Uint8Array(outputBuffer), {
      headers: createDownloadHeaders(outputFileName, contentTypes[outputFormatValue]),
    });
  } catch {
    return buildToolErrorResponse(
      `This spreadsheet could not be converted to ${formatLabels[outputFormatValue]}.`,
      500,
    );
  }
}
