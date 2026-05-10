import JSZip from "jszip";
import { ConvertedFile } from "@/types/converter";

export async function createZipFromFiles(files: ConvertedFile[]): Promise<Blob> {
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.fileName, file.blob);
  });

  return zip.generateAsync({ type: "blob" });
}
