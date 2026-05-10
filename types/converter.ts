export type OutputFormat =
  | "avif"
  | "bmp"
  | "gif"
  | "ico"
  | "jpg"
  | "png"
  | "tiff"
  | "webp";

export type OutputOptions = {
  quality: number;
  width?: number;
  height?: number;
  keepMetadata: boolean;
  backgroundColor: string;
};

export type UploadedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  originalFormat: string;
  status: "ready" | "over_limit";
};

export type ConvertedFile = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  blob: Blob;
  convertedAt: string;
  expiresAt: number;
};

export type ConversionHistoryItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  convertedAt: string;
  expiresAt: number;
  outputFormat: OutputFormat;
};

export type ConversionStage =
  | "waiting"
  | "uploading"
  | "converting"
  | "finalizing"
  | "done"
  | "failed";

export type ConversionProgressItem = {
  id: string;
  fileName: string;
  fileSize: number;
  originalFormat: string;
  outputFormat: OutputFormat;
  progress: number;
  stage: ConversionStage;
  error: string | null;
  downloadUrl?: string;
};

export type ConverterState = {
  isConverting: boolean;
  error: string | null;
  successMessage: string | null;
};

export type FileValidationResult = {
  isValid: boolean;
  error?: string;
};
