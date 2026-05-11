import { OutputFormat, OutputOptions } from "@/types/converter";

export type ConversionEngineName =
  | "sharp"
  | "imagemagick"
  | "ffmpeg"
  | "libreoffice"
  | "sevenzip";

export type ConversionJobStatus =
  | "queued"
  | "processing"
  | "finished"
  | "failed";

export type ConversionTaskOperation = "convert";

export type ConversionTaskRequest = {
  operation: ConversionTaskOperation;
  input?: string | string[];
  input_format?: string;
  output_format: OutputFormat;
  engine?: ConversionEngineName;
  options?: Partial<OutputOptions>;
};

export type ConversionJobRequest = {
  tasks: Record<string, ConversionTaskRequest>;
};

export type ConversionProcessingMode = "inline" | "queued";

export type ConversionApiIdentity = {
  type: "api_key" | "development";
  userId: string | null;
  apiKeyId: string | null;
};

export type ConversionJobFile = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type StoredConversionJobFile = ConversionJobFile & {
  storagePath: string | null;
};

export type ConversionJobRecord = {
  id: string;
  status: ConversionJobStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  inputFiles: ConversionJobFile[];
  outputFiles: ConversionJobFile[];
  error: string | null;
};

export type StoredConversionOutput = ConversionJobFile & {
  buffer: Buffer;
  storagePath?: string | null;
};
