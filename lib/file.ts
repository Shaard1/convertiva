import {
  CONVERSION_POLICIES,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
} from "@/lib/constants";
import { FileValidationResult } from "@/types/converter";
import { formatFileSize, getFileExtensionLabel } from "@/lib/format";

function isSupportedMimeType(file: File) {
  if (!file.type) {
    // Some browsers leave MIME empty for certain icons/files.
    return true;
  }

  return SUPPORTED_INPUT_MIME_TYPES.includes(
    file.type as (typeof SUPPORTED_INPUT_MIME_TYPES)[number],
  );
}

function isSupportedExtension(extension: string) {
  return SUPPORTED_INPUT_EXTENSIONS.includes(
    extension as (typeof SUPPORTED_INPUT_EXTENSIONS)[number],
  );
}

function isGenericMimeType(type: string) {
  return type.length === 0 || type === "application/octet-stream";
}

export function validateFile(
  file: File,
  maxFileSizeBytes = CONVERSION_POLICIES.guest.maxFileSizeBytes,
): FileValidationResult {
  const extension = getFileExtensionLabel(file.name);
  const isExtensionSupported = isSupportedExtension(extension);
  const isMimeSupported = isSupportedMimeType(file);
  const canUseExtensionFallback =
    isExtensionSupported &&
    ["bmp", "ico", "jfif"].includes(extension) &&
    isGenericMimeType(file.type);

  if (!isExtensionSupported || (!isMimeSupported && !canUseExtensionFallback)) {
    return { isValid: false, error: "Unsupported file type detected." };
  }

  if (file.size > maxFileSizeBytes) {
    return {
      isValid: false,
      error: `File size must be under ${formatFileSize(maxFileSizeBytes)}.`,
    };
  }

  return { isValid: true };
}
