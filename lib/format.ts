import { OutputFormat } from "@/types/converter";

function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function getOutputMimeType(format: OutputFormat): string {
  switch (format) {
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    case "gif":
      return "image/gif";
    case "ico":
      return "image/x-icon";
    case "png":
      return "image/png";
    case "jpg":
      return "image/jpeg";
    case "tiff":
      return "image/tiff";
    case "webp":
      return "image/webp";
  }
}

export function replaceFileExtension(fileName: string, format: OutputFormat): string {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName}.${format}`;
}

export function getFileFormatLabel(fileName: string): string {
  const extension = getFileExtension(fileName);

  switch (extension) {
    case "avif":
      return "AVIF";
    case "bmp":
      return "BMP";
    case "gif":
      return "GIF";
    case "ico":
      return "ICO";
    case "jpg":
      return "JPG";
    case "jpeg":
      return "JPEG";
    case "jfif":
      return "JFIF";
    case "png":
      return "PNG";
    case "tif":
    case "tiff":
      return "TIFF";
    case "webp":
      return "WEBP";
    default:
      return extension.toUpperCase() || "Unknown";
  }
}

export function getFileExtensionLabel(fileName: string): string {
  return getFileExtension(fileName);
}
