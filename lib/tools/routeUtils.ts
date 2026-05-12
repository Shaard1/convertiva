export function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function hasFileExtension(fileName: string, extensions: string[]) {
  return extensions.includes(getFileExtension(fileName));
}

export function createDownloadHeaders(fileName: string, contentType: string) {
  return {
    "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    "Content-Type": contentType,
    "X-Converted-File-Name": encodeURIComponent(fileName),
  };
}

export function decodeFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildToolErrorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
