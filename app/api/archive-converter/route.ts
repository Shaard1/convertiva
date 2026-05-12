import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  decodeFormString,
  hasFileExtension,
} from "@/lib/tools/routeUtils";
import {
  cleanupTemporaryDirectory,
  createTemporaryDirectory,
} from "@/lib/tools/archive";

export const runtime = "nodejs";

const sevenZipExecutable = "C:\\Program Files\\7-Zip\\7z.exe";
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const supportedInputExtensions = ["zip", "7z", "rar", "tar", "gz", "tgz"];
const supportedOutputFormats = ["zip", "7z", "tar"];

function runSevenZip(args: string[], workingDirectory: string) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn(sevenZipExecutable, args, {
      cwd: workingDirectory,
      windowsHide: true,
    });

    let stderr = "";

    process.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `7-Zip failed with exit code ${code}.`));
    });
  });
}

async function hasExtractedFiles(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.length > 0;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const outputFormat = decodeFormString(formData.get("outputFormat")).toLowerCase();

  if (!(file instanceof File)) {
    return buildToolErrorResponse("Upload one archive file to convert.");
  }

  if (!hasFileExtension(file.name, supportedInputExtensions)) {
    return buildToolErrorResponse("Use a ZIP, 7Z, RAR, TAR, GZ, or TGZ archive.");
  }

  if (!supportedOutputFormats.includes(outputFormat)) {
    return buildToolErrorResponse("Choose ZIP, 7Z, or TAR as the output format.");
  }

  if (file.size > MAX_ARCHIVE_BYTES) {
    return buildToolErrorResponse("The archive must be under 100 MB.", 413);
  }

  const sourceDirectory = await createTemporaryDirectory("convertly-archive-input-");
  const outputDirectory = await createTemporaryDirectory("convertly-archive-output-");

  try {
    const inputPath = join(sourceDirectory, file.name);
    const extractedPath = join(sourceDirectory, "extracted");
    const outputArchiveName = `converted-archive.${outputFormat}`;
    const outputPath = join(outputDirectory, outputArchiveName);

    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    await runSevenZip(["x", "-y", inputPath, `-o${extractedPath}`], sourceDirectory);

    if (!(await hasExtractedFiles(extractedPath))) {
      return buildToolErrorResponse("The archive did not contain any files to convert.");
    }

    await runSevenZip(["a", "-y", `-t${outputFormat}`, outputPath, ".\\*"], extractedPath);

    const archiveBytes = await stat(outputPath);
    const buffer = await readFile(outputPath).catch(() => null);

    if (!buffer || !archiveBytes.size) {
      return buildToolErrorResponse("The converted archive could not be created.", 500);
    }

    return new Response(new Uint8Array(buffer), {
      headers: createDownloadHeaders(outputArchiveName, "application/octet-stream"),
    });
  } catch {
    return buildToolErrorResponse("The archive could not be converted. Try another file.", 500);
  } finally {
    await cleanupTemporaryDirectory(sourceDirectory);
    await cleanupTemporaryDirectory(outputDirectory);
  }
}
