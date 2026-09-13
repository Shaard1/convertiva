import type { OutputFormat } from "@/types/converter";

type PendingImageUpload = { files: File[]; outputFormat: OutputFormat };

// Keep File objects in this browser tab across client-side navigation.
// Upload contents never go into a URL, localStorage, or server-rendered HTML.
let pendingUpload: PendingImageUpload | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

export function stageImageUpload(files: File[], outputFormat: OutputFormat) {
  clearTimeout(expiryTimer);
  pendingUpload = { files: [...files], outputFormat };
  expiryTimer = setTimeout(() => { pendingUpload = null; }, 5 * 60 * 1000);
}

export function consumeImageUpload(): PendingImageUpload | null {
  clearTimeout(expiryTimer);
  const upload = pendingUpload;
  pendingUpload = null;
  return upload;
}
