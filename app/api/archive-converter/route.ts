import { lstat, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  decodeFormString,
  handleToolRequest,
  hasFileExtension,
  rejectOversizedRequest,
} from "@/lib/tools/routeUtils";
import {
  cleanupTemporaryDirectory,
  createTemporaryDirectory,
} from "@/lib/tools/archive";

export const runtime = "nodejs";

const sevenZipExecutable =
  process.env.SEVEN_ZIP_PATH ??
  (process.platform === "win32" ? "C:\\Program Files\\7-Zip\\7z.exe" : "7z");
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 500 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 250 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 2_000;
const SEVEN_ZIP_TIMEOUT_MS = 2 * 60 * 1000;
const supportedInputExtensions = ["zip", "7z", "rar", "tar", "gz", "tgz"];
const supportedOutputFormats = ["zip", "7z", "tar"];

function runSevenZip(args: string[], workingDirectory: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(sevenZipExecutable, args, {
      cwd: workingDirectory,
      windowsHide: true,
    });

    let stderr = "";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error("7-Zip processing timed out."));
    }, SEVEN_ZIP_TIMEOUT_MS);

    child.stderr.on("data", (chunk) => {
      if (stderr.length < 8_000) {
        stderr += chunk.toString().slice(0, 8_000 - stderr.length);
      }
    });

    child.once("error", (error) => finish(error));
    child.once("close", (code) => {
      if (code === 0) {
        finish();
        return;
      }

      finish(new Error(stderr || `7-Zip failed with exit code ${code}.`));
    });
  });
}

async function hasExtractedFiles(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.length > 0;
}

async function validateExtractedDirectory(directory: string) {
  let entryCount = 0;
  let totalBytes = 0;
  const pendingDirectories = [directory];

  while (pendingDirectories.length) {
    const currentDirectory = pendingDirectories.pop();

    if (!currentDirectory) {
      break;
    }

    const entries = await readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      entryCount += 1;

      if (entryCount > MAX_ARCHIVE_ENTRIES) {
        throw new Error("The archive contains too many entries.");
      }

      const entryPath = join(currentDirectory, entry.name);
      const entryStats = await lstat(entryPath);

      if (entryStats.isSymbolicLink()) {
        throw new Error("Archive links are not supported.");
      }

      if (entryStats.isDirectory()) {
        pendingDirectories.push(entryPath);
        continue;
      }

      totalBytes += entryStats.size;

      if (totalBytes > MAX_EXPANDED_BYTES) {
        throw new Error("The expanded archive exceeds the allowed size.");
      }
    }
  }
}

export async function POST(request: Request) {
  return handleToolRequest("convert_archive", "The archive could not be converted.", async () => {
  const sizeError = rejectOversizedRequest(request, MAX_ARCHIVE_BYTES + 1024 * 1024);

  if (sizeError) {
    return sizeError;
  }

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
    const inputExtension = file.name.split(".").pop()?.toLowerCase() ?? "archive";
    const inputPath = join(sourceDirectory, `input.${inputExtension}`);
    const extractedPath = join(sourceDirectory, "extracted");
    const outputArchiveName = `converted-archive.${outputFormat}`;
    const outputPath = join(outputDirectory, outputArchiveName);

    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    await runSevenZip(["x", "-y", inputPath, `-o${extractedPath}`], sourceDirectory);

    if (!(await hasExtractedFiles(extractedPath))) {
      return buildToolErrorResponse("The archive did not contain any files to convert.");
    }

    await validateExtractedDirectory(extractedPath);

    await runSevenZip(["a", "-y", `-t${outputFormat}`, outputPath, ".\\*"], extractedPath);

    const archiveBytes = await stat(outputPath);

    if (archiveBytes.size > MAX_OUTPUT_BYTES) {
      return buildToolErrorResponse("The converted archive exceeds the output limit.", 413);
    }

    const buffer = await readFile(outputPath).catch(() => null);

    if (!buffer || !archiveBytes.size) {
      return buildToolErrorResponse("The converted archive could not be created.", 500);
    }

    return new Response(new Uint8Array(buffer), {
      headers: createDownloadHeaders(outputArchiveName, "application/octet-stream"),
    });
  } catch (error) {
    console.error("Archive conversion failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return buildToolErrorResponse("The archive could not be converted. Try another file.", 500);
  } finally {
    await cleanupTemporaryDirectory(sourceDirectory);
    await cleanupTemporaryDirectory(outputDirectory);
  }
  });
}
