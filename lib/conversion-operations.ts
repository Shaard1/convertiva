import {
  CONVERSION_POLICIES,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
} from "@/lib/constants";
import { audioFormats } from "@/lib/formats/audioFormats";
import { documentFormats } from "@/lib/formats/documentFormats";
import { videoFormats } from "@/lib/formats/videoFormats";
import {
  ConversionEngineName,
  ConversionToolName,
} from "@/types/conversion-platform";

export type ConversionInputPolicy = {
  extensions: readonly string[];
  maxFileBytes: number;
  maxFiles: number;
  mimePrefixes?: readonly string[];
  mimeTypes?: readonly string[];
};

export type ConversionOperationDefinition = {
  defaultEngine: ConversionEngineName;
  input: ConversionInputPolicy;
  outputFormats: readonly string[];
  tool: ConversionToolName;
};

export const IMAGE_OUTPUT_FORMATS = [
  "avif",
  "bmp",
  "gif",
  "ico",
  "jpg",
  "pdf",
  "png",
  "tiff",
  "webp",
] as const;

const ARCHIVE_OUTPUT_FORMATS = ["zip", "7z", "tar"] as const;

export const CONVERSION_OPERATIONS = {
  image: {
    tool: "image",
    defaultEngine: "sharp",
    outputFormats: IMAGE_OUTPUT_FORMATS,
    input: {
      extensions: SUPPORTED_INPUT_EXTENSIONS,
      mimeTypes: SUPPORTED_INPUT_MIME_TYPES,
      maxFiles: CONVERSION_POLICIES.authenticated.maxBatchFiles,
      maxFileBytes: CONVERSION_POLICIES.authenticated.maxFileSizeBytes,
    },
  },
  video: {
    tool: "video",
    defaultEngine: "ffmpeg",
    outputFormats: videoFormats.map((format) => format.toLowerCase()),
    input: {
      extensions: [
        "3g2",
        "3gp",
        "avi",
        "flv",
        "m4v",
        "mkv",
        "mov",
        "mp4",
        "mpeg",
        "mpg",
        "mts",
        "mxf",
        "ogv",
        "ts",
        "vob",
        "webm",
        "wmv",
      ],
      mimePrefixes: ["video/"],
      maxFiles: 1,
      maxFileBytes: 250 * 1024 * 1024,
    },
  },
  audio: {
    tool: "audio",
    defaultEngine: "ffmpeg",
    outputFormats: audioFormats.map((format) => format.toLowerCase()),
    input: {
      extensions: [
        "aac",
        "ac3",
        "aif",
        "aiff",
        "amr",
        "au",
        "caf",
        "flac",
        "m4a",
        "m4b",
        "mp3",
        "oga",
        "opus",
        "wav",
        "weba",
        "wma",
      ],
      mimePrefixes: ["audio/"],
      maxFiles: 1,
      maxFileBytes: 100 * 1024 * 1024,
    },
  },
  document: {
    tool: "document",
    defaultEngine: "libreoffice",
    outputFormats: documentFormats.map((format) => format.toLowerCase()),
    input: {
      extensions: [
        "csv",
        "doc",
        "docx",
        "html",
        "md",
        "odt",
        "pdf",
        "rtf",
        "txt",
        "xls",
        "xlsx",
      ],
      mimePrefixes: ["application/", "text/"],
      maxFiles: 1,
      maxFileBytes: 50 * 1024 * 1024,
    },
  },
  archive: {
    tool: "archive",
    defaultEngine: "sevenzip",
    outputFormats: ARCHIVE_OUTPUT_FORMATS,
    input: {
      extensions: ["7z", "gz", "rar", "tar", "tgz", "zip"],
      mimePrefixes: ["application/"],
      maxFiles: 1,
      maxFileBytes: 100 * 1024 * 1024,
    },
  },
} satisfies Record<ConversionToolName, ConversionOperationDefinition>;

export function isConversionToolName(
  value: unknown,
): value is ConversionToolName {
  return typeof value === "string" && value in CONVERSION_OPERATIONS;
}

export function getConversionOperation(
  tool: ConversionToolName,
): ConversionOperationDefinition {
  return CONVERSION_OPERATIONS[tool];
}

export function isSupportedConversionOutput(
  tool: ConversionToolName,
  outputFormat: string,
) {
  const operation = getConversionOperation(tool);
  return operation.outputFormats.includes(outputFormat.toLowerCase());
}

export function listConversionOperations() {
  return Object.values(CONVERSION_OPERATIONS).map((operation) => ({
    tool: operation.tool,
    defaultEngine: operation.defaultEngine,
    input: {
      maxFiles: operation.input.maxFiles,
      maxFileBytes: operation.input.maxFileBytes,
      extensions: [...operation.input.extensions],
    },
    outputFormats: [...operation.outputFormats],
  }));
}
