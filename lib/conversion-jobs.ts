import {
  CONVERSION_POLICIES,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
} from "@/lib/constants";
import { CapacityExceededError } from "@/lib/capacity";
import {
  canEngineHandleTool,
  getConversionEngine,
  isConversionEngineImplemented,
  isWorkerConversionEngine,
} from "@/lib/conversion-engines";
import { getOutputMimeType } from "@/lib/format";
import { audioFormats } from "@/lib/formats/audioFormats";
import { documentFormats } from "@/lib/formats/documentFormats";
import { videoFormats } from "@/lib/formats/videoFormats";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { OutputFormat, OutputOptions } from "@/types/converter";
import {
  ConversionApiIdentity,
  ConversionEngineName,
  ConversionJobRecord,
  ConversionJobRequest,
  ConversionProcessingMode,
  ConversionToolName,
  ConversionTaskRequest,
  StoredConversionJobFile,
  StoredConversionOutput,
} from "@/types/conversion-platform";

const JOB_RETENTION_MS = 60 * 60 * 1000;
const JOB_STORAGE_BUCKET = "conversion-platform-files";
const MAX_JOB_TOTAL_BYTES = 250 * 1024 * 1024;
const MAX_WORKER_OUTPUT_FILES = 50;
const MAX_WORKER_OUTPUT_BYTES = 500 * 1024 * 1024;
const DEFAULT_OUTPUT_OPTIONS: OutputOptions = {
  quality: 90,
  keepMetadata: false,
  backgroundColor: "#ffffff",
};

type ToolConversionConfig = {
  defaultEngine: ConversionEngineName;
  outputFormats: readonly string[];
};

const archiveOutputFormats = ["zip", "7z", "tar"] as const;
const imageOutputFormats = ["avif", "bmp", "gif", "ico", "jpg", "pdf", "png", "tiff", "webp"] as const;
const toolInputPolicies = {
  image: {
    extensions: SUPPORTED_INPUT_EXTENSIONS,
    mimePrefixes: ["image/"],
    maxFiles: CONVERSION_POLICIES.authenticated.maxBatchFiles,
    maxFileBytes: CONVERSION_POLICIES.authenticated.maxFileSizeBytes,
  },
  video: {
    extensions: ["3g2", "3gp", "avi", "flv", "m4v", "mkv", "mov", "mp4", "mpeg", "mpg", "mts", "mxf", "ogv", "ts", "vob", "webm", "wmv"],
    mimePrefixes: ["video/"],
    maxFiles: 1,
    maxFileBytes: 250 * 1024 * 1024,
  },
  audio: {
    extensions: ["aac", "ac3", "aif", "aiff", "amr", "au", "caf", "flac", "m4a", "m4b", "mp3", "oga", "opus", "wav", "weba", "wma"],
    mimePrefixes: ["audio/"],
    maxFiles: 1,
    maxFileBytes: 100 * 1024 * 1024,
  },
  document: {
    extensions: ["csv", "doc", "docx", "html", "md", "odt", "pdf", "rtf", "txt", "xls", "xlsx"],
    mimePrefixes: ["application/", "text/"],
    maxFiles: 1,
    maxFileBytes: 50 * 1024 * 1024,
  },
  archive: {
    extensions: ["7z", "gz", "rar", "tar", "tgz", "zip"],
    mimePrefixes: ["application/"],
    maxFiles: 1,
    maxFileBytes: 100 * 1024 * 1024,
  },
} satisfies Record<
  ConversionToolName,
  {
    extensions: readonly string[];
    mimePrefixes: readonly string[];
    maxFiles: number;
    maxFileBytes: number;
  }
>;

const toolConversionConfigs = {
  image: {
    defaultEngine: "sharp",
    outputFormats: imageOutputFormats,
  },
  video: {
    defaultEngine: "ffmpeg",
    outputFormats: videoFormats.map((format) => format.toLowerCase()),
  },
  audio: {
    defaultEngine: "ffmpeg",
    outputFormats: audioFormats.map((format) => format.toLowerCase()),
  },
  document: {
    defaultEngine: "libreoffice",
    outputFormats: documentFormats.map((format) => format.toLowerCase()),
  },
  archive: {
    defaultEngine: "sevenzip",
    outputFormats: archiveOutputFormats,
  },
} satisfies Record<ConversionToolName, ToolConversionConfig>;

type StoredConversionJob = Omit<ConversionJobRecord, "inputFiles" | "outputFiles"> & {
  userId: string | null;
  apiKeyId: string | null;
  convertTask: ConversionTaskRequest;
  inputUploads: File[];
  inputFiles: StoredConversionJobFile[];
  outputFiles: StoredConversionJobFile[];
  outputs: StoredConversionOutput[];
};

const conversionJobs = new Map<string, StoredConversionJob>();

type JobRow = {
  id: string;
  status: ConversionJobRecord["status"];
  created_at: string;
  updated_at: string;
  expires_at: string;
  error: string | null;
  task_payload: unknown;
  user_id: string | null;
  api_key_id: string | null;
};

type JobFileRow = {
  id: string;
  job_id: string;
  role: "input" | "output";
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string | null;
};

class ConversionJobError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function getExpiresAt() {
  return new Date(Date.now() + JOB_RETENTION_MS).toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJobPayload(value: FormDataEntryValue | null): ConversionJobRequest {
  if (typeof value !== "string") {
    throw new ConversionJobError("Missing job payload.");
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isObject(parsed) || !isObject(parsed.tasks)) {
      throw new ConversionJobError("Job payload must include tasks.");
    }

    return parsed as ConversionJobRequest;
  } catch (error) {
    if (error instanceof ConversionJobError) {
      throw error;
    }

    throw new ConversionJobError("Job payload must be valid JSON.");
  }
}

function getConvertTask(jobRequest: ConversionJobRequest): ConversionTaskRequest {
  const tasks = Object.values(jobRequest.tasks);
  const convertTasks = tasks.filter(isConversionTask);

  if (tasks.length !== 1 || convertTasks.length !== 1) {
    throw new ConversionJobError("Exactly one convert task is required.");
  }

  return convertTasks[0];
}

function isConversionTool(value: unknown): value is ConversionToolName {
  return typeof value === "string" && value in toolConversionConfigs;
}

function getConversionTool(task: ConversionTaskRequest): ConversionToolName {
  return isConversionTool(task.tool) ? task.tool : "image";
}

function getTaskEngine(task: ConversionTaskRequest): ConversionEngineName {
  const tool = getConversionTool(task);
  return task.engine ?? toolConversionConfigs[tool].defaultEngine;
}

function isSupportedOutputFormat(tool: ConversionToolName, value: string) {
  const outputFormats: readonly string[] = toolConversionConfigs[tool].outputFormats;
  return outputFormats.includes(value.toLowerCase());
}

function isImageOutputFormat(value: string): value is OutputFormat {
  return (imageOutputFormats as readonly string[]).includes(value);
}

function getOutputOptions(
  options?: Record<string, unknown>,
): OutputOptions {
  const quality =
    typeof options?.quality === "number" &&
    Number.isFinite(options.quality) &&
    options.quality >= 1 &&
    options.quality <= 100
      ? Math.round(options.quality)
      : DEFAULT_OUTPUT_OPTIONS.quality;
  const dimension = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 10_000
      ? Math.round(value)
      : undefined;
  const backgroundColor =
    typeof options?.backgroundColor === "string" &&
    /^#[0-9a-f]{6}$/i.test(options.backgroundColor)
      ? options.backgroundColor
      : DEFAULT_OUTPUT_OPTIONS.backgroundColor;
  const requestedFitMode = options?.fitMode;
  const fitMode: OutputOptions["fitMode"] =
    requestedFitMode === "max" ||
    requestedFitMode === "crop" ||
    requestedFitMode === "scale"
      ? requestedFitMode
      : undefined;

  return {
    quality,
    width: dimension(options?.width),
    height: dimension(options?.height),
    fitMode,
    keepMetadata:
      typeof options?.keepMetadata === "boolean"
        ? options.keepMetadata
        : DEFAULT_OUTPUT_OPTIONS.keepMetadata,
    backgroundColor,
  };
}

function enumOption(value: unknown, allowedValues: readonly string[]) {
  return typeof value === "string" && allowedValues.includes(value)
    ? value
    : "auto";
}

function trimOption(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();
  return /^(?:\d+(?:\.\d{1,3})?|\d{1,3}:[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?)$/.test(
    normalized,
  )
    ? normalized
    : "";
}

function normalizeTaskOptions(
  tool: ConversionToolName,
  options?: Record<string, unknown>,
): Record<string, unknown> {
  if (tool === "image") {
    return getOutputOptions(options);
  }

  if (tool === "audio") {
    return {
      quality: enumOption(options?.quality, ["auto", "low", "medium", "high"]),
      bitrate: enumOption(options?.bitrate, ["auto", "96", "128", "192", "256", "320"]),
      sampleRate: enumOption(options?.sampleRate, ["auto", "22050", "44100", "48000"]),
      channels: enumOption(options?.channels, ["auto", "mono", "stereo"]),
      trimStart: trimOption(options?.trimStart),
      trimEnd: trimOption(options?.trimEnd),
      normalizeVolume: options?.normalizeVolume === true,
    };
  }

  if (tool === "video") {
    return {
      resolution: enumOption(options?.resolution, ["auto", "480p", "720p", "1080p", "1440p", "4k"]),
      quality: enumOption(options?.quality, ["auto", "low", "medium", "high"]),
      videoCodec: enumOption(options?.videoCodec, ["auto", "h264", "h265", "vp9", "av1"]),
      audioCodec: enumOption(options?.audioCodec, ["auto", "aac", "mp3", "opus", "vorbis"]),
      removeAudio: options?.removeAudio === true,
      trimStart: trimOption(options?.trimStart),
      trimEnd: trimOption(options?.trimEnd),
    };
  }

  return {};
}

function getProcessingMode(): ConversionProcessingMode {
  return process.env.CONVERSION_PROCESSING_MODE === "queued" ? "queued" : "inline";
}

function isConversionTask(value: unknown): value is ConversionTaskRequest {
  return (
    isObject(value) &&
    value.operation === "convert" &&
    (!("tool" in value) || isConversionTool(value.tool)) &&
    typeof value.output_format === "string"
  );
}

function validateFiles(files: File[], tool: ConversionToolName) {
  const policy = toolInputPolicies[tool];

  if (!files.length) {
    throw new ConversionJobError("At least one file is required.");
  }

  if (files.length > policy.maxFiles) {
    throw new ConversionJobError(
      `Upload ${policy.maxFiles} file${policy.maxFiles === 1 ? "" : "s"} or fewer per job.`,
    );
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes > MAX_JOB_TOTAL_BYTES) {
    throw new ConversionJobError("The combined upload size exceeds the job limit.", 413);
  }

  files.forEach((file) => {
    if (file.size > policy.maxFileBytes) {
      throw new ConversionJobError("One or more files exceed the size limit.", 413);
    }

    if (
      !file.name ||
      file.name.length > 180 ||
      /[\\/\u0000-\u001f]/.test(file.name)
    ) {
      throw new ConversionJobError("One or more file names are invalid.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const hasAllowedExtension = (policy.extensions as readonly string[]).includes(
      extension,
    );
    const hasAllowedMimeType =
      tool === "image"
        ? SUPPORTED_INPUT_MIME_TYPES.includes(
            file.type as (typeof SUPPORTED_INPUT_MIME_TYPES)[number],
          )
        : policy.mimePrefixes.some((prefix) => file.type.startsWith(prefix));
    const hasGenericMimeType =
      !file.type || file.type === "application/octet-stream";

    if (!hasAllowedExtension || (!hasAllowedMimeType && !hasGenericMimeType)) {
      throw new ConversionJobError(`Unsupported ${tool} input file.`);
    }
  });
}

function createJob(
  files: File[],
  convertTask: ConversionTaskRequest,
  identity: ConversionApiIdentity,
): StoredConversionJob {
  const timestamp = nowIso();
  const job: StoredConversionJob = {
    id: `job_${crypto.randomUUID()}`,
    status: "queued",
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: getExpiresAt(),
    userId: identity.userId,
    apiKeyId: identity.apiKeyId,
    convertTask,
    inputUploads: files,
    inputFiles: files.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      storagePath: null,
    })),
    outputFiles: [],
    outputs: [],
    error: null,
  };

  conversionJobs.set(job.id, job);
  return job;
}

function toPublicJob(job: StoredConversionJob): ConversionJobRecord {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
    inputFiles: job.inputFiles.map(toPublicFile),
    outputFiles: job.outputFiles.map(toPublicFile),
    error: job.error,
  };
}

function toPublicFile(file: StoredConversionJobFile) {
  return {
    id: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
  };
}

function mapJobRow(row: JobRow, files: JobFileRow[]): StoredConversionJob {
  if (!isConversionTask(row.task_payload)) {
    throw new ConversionJobError("Stored job task payload is invalid.", 500);
  }

  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    error: row.error,
    userId: row.user_id,
    apiKeyId: row.api_key_id,
    convertTask: row.task_payload,
    inputUploads: [],
    inputFiles: files.filter((file) => file.role === "input").map(mapFileRow),
    outputFiles: files.filter((file) => file.role === "output").map(mapFileRow),
    outputs: [],
  };
}

function mapFileRow(row: JobFileRow): StoredConversionJobFile {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    storagePath: row.storage_path,
  };
}

function isWorkerJob(job: StoredConversionJob) {
  return isWorkerConversionEngine(getTaskEngine(job.convertTask));
}

function canWorkerClaimJob(
  job: StoredConversionJob,
  tools: ConversionToolName[],
) {
  if (!isWorkerJob(job)) {
    return false;
  }

  if (!tools.length) {
    return true;
  }

  return tools.includes(getConversionTool(job.convertTask));
}

function serializeWorkerJob(job: StoredConversionJob) {
  return {
    data: {
      ...toPublicJob(job),
      task: job.convertTask,
      inputFiles: job.inputFiles.map((file) => ({
        ...toPublicFile(file),
        downloadUrl: `/api/v1/workers/jobs/${job.id}/inputs/${file.id}`,
      })),
    },
  };
}

async function persistJob(job: StoredConversionJob) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const { error: jobError } = await supabase.from("conversion_platform_jobs").upsert({
    id: job.id,
    status: job.status,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    expires_at: job.expiresAt,
    error: job.error,
    task_payload: job.convertTask,
    user_id: job.userId,
    api_key_id: job.apiKeyId,
  });

  if (jobError) {
    throw new ConversionJobError("Could not persist the conversion job.", 503);
  }

  if (job.inputFiles.length) {
    const { error: fileError } = await supabase.from("conversion_platform_files").upsert(
      job.inputFiles.map((file) => ({
        id: file.id,
        job_id: job.id,
        role: "input",
        file_name: file.fileName,
        mime_type: file.mimeType,
        size_bytes: file.size,
        storage_path: file.storagePath,
      })),
    );

    if (fileError) {
      throw new ConversionJobError("Could not persist conversion inputs.", 503);
    }
  }
}

async function persistJobStatus(job: StoredConversionJob) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("conversion_platform_jobs")
    .update({
      status: job.status,
      updated_at: job.updatedAt,
      error: job.error,
      user_id: job.userId,
      api_key_id: job.apiKeyId,
      worker_lease_expires_at:
        job.status === "processing" ? undefined : null,
    })
    .eq("id", job.id);

  if (error) {
    throw new ConversionJobError("Could not update the conversion job.", 503);
  }
}

async function persistOutputFiles(job: StoredConversionJob) {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !job.outputFiles.length) {
    return;
  }

  const { error } = await supabase.from("conversion_platform_files").upsert(
    job.outputFiles.map((file) => ({
      id: file.id,
      job_id: job.id,
      role: "output",
      file_name: file.fileName,
      mime_type: file.mimeType,
      size_bytes: file.size,
      storage_path: file.storagePath,
    })),
  );

  if (error) {
    throw new ConversionJobError("Could not persist converted outputs.", 503);
  }
}

async function recordUsageEvent(job: StoredConversionJob) {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !job.apiKeyId || !job.outputFiles.length) {
    return;
  }

  const { error } = await supabase.from("conversion_usage_events").insert({
    api_key_id: job.apiKeyId,
    user_id: job.userId,
    job_id: job.id,
    event_type: "conversion_completed",
    conversion_count: job.outputFiles.length,
  });

  if (error) {
    console.error("Conversion usage event could not be recorded", {
      jobId: job.id,
      apiKeyId: job.apiKeyId,
    });
  }
}

async function persistInputFiles(job: StoredConversionJob) {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !job.inputFiles.length) {
    return;
  }

  const { error } = await supabase.from("conversion_platform_files").upsert(
    job.inputFiles.map((file) => ({
      id: file.id,
      job_id: job.id,
      role: "input",
      file_name: file.fileName,
      mime_type: file.mimeType,
      size_bytes: file.size,
      storage_path: file.storagePath,
    })),
  );

  if (error) {
    throw new ConversionJobError("Could not update conversion inputs.", 503);
  }
}

async function uploadInputs(job: StoredConversionJob) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  for (const [index, file] of job.inputUploads.entries()) {
    const inputFile = job.inputFiles[index];
    const storagePath = `${job.id}/inputs/${inputFile.id}/${inputFile.fileName}`;
    const { error } = await supabase.storage
      .from(JOB_STORAGE_BUCKET)
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: inputFile.mimeType,
        upsert: true,
      });

    if (error) {
      throw new ConversionJobError("Could not store input file.", 503);
    }

    inputFile.storagePath = storagePath;
  }
}

async function uploadOutputs(jobId: string, outputs: StoredConversionOutput[]) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return outputs;
  }

  const uploadedOutputs: StoredConversionOutput[] = [];

  for (const output of outputs) {
    const storagePath = `${jobId}/outputs/${output.id}/${output.fileName}`;
    const { error } = await supabase.storage
      .from(JOB_STORAGE_BUCKET)
      .upload(storagePath, output.buffer, {
        contentType: output.mimeType,
        upsert: true,
      });

    if (error) {
      throw new ConversionJobError("Could not store converted output.", 503);
    }

    uploadedOutputs.push({
      ...output,
      storagePath,
    });
  }

  return uploadedOutputs;
}

async function loadStoredJob(jobId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data: jobRow, error: jobError } = await supabase
    .from("conversion_platform_jobs")
    .select("id,status,created_at,updated_at,expires_at,error,task_payload,user_id,api_key_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !jobRow) {
    return null;
  }

  const { data: fileRows, error: fileError } = await supabase
    .from("conversion_platform_files")
    .select("id,job_id,role,file_name,mime_type,size_bytes,storage_path")
    .eq("job_id", jobId);

  if (fileError) {
    return null;
  }

  return mapJobRow(jobRow as JobRow, (fileRows ?? []) as JobFileRow[]);
}

async function loadNextQueuedJob() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    const job = Array.from(conversionJobs.values())
      .filter(
        (job) =>
          job.status === "queued" &&
          new Date(job.expiresAt).getTime() > Date.now() &&
          !isWorkerJob(job),
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ?? null;

    if (job) {
      job.status = "processing";
      job.updatedAt = nowIso();
    }

    return job;
  }

  const { data, error } = await supabase.rpc(
    "claim_next_inline_conversion_job",
  );

  if (error) {
    throw new ConversionJobError("Could not claim an inline conversion job.", 503);
  }

  const claimedRow = Array.isArray(data)
    ? (data[0] as { job_id?: unknown } | undefined)
    : undefined;
  const claimedJobId =
    typeof claimedRow?.job_id === "string" ? claimedRow.job_id : null;

  if (!claimedJobId) {
    return null;
  }

  const job = await loadStoredJob(claimedJobId);

  if (!job) {
    throw new ConversionJobError("Claimed inline job could not be loaded.", 503);
  }

  return job;
}

async function loadNextQueuedWorkerJob(tools: ConversionToolName[] = []) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    const job = Array.from(conversionJobs.values())
      .filter(
        (job) =>
          job.status === "queued" &&
          new Date(job.expiresAt).getTime() > Date.now() &&
          canWorkerClaimJob(job, tools),
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ?? null;

    if (job) {
      job.status = "processing";
      job.updatedAt = nowIso();
    }

    return job;
  }

  const { data, error } = await supabase.rpc(
    "claim_next_worker_conversion_job",
    { p_requested_tools: tools },
  );

  if (error) {
    throw new ConversionJobError("Could not claim a conversion job.", 503);
  }

  const claimedRow = Array.isArray(data)
    ? (data[0] as { job_id?: unknown } | undefined)
    : undefined;
  const claimedJobId =
    typeof claimedRow?.job_id === "string" ? claimedRow.job_id : null;

  if (!claimedJobId) {
    return null;
  }

  const job = await loadStoredJob(claimedJobId);

  if (!job) {
    throw new ConversionJobError("Claimed conversion job could not be loaded.", 503);
  }

  return job;
}

async function downloadStoredInput(
  file: StoredConversionJobFile,
): Promise<File | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !file.storagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(JOB_STORAGE_BUCKET)
    .download(file.storagePath);

  if (error || !data) {
    return null;
  }

  return new File([await data.arrayBuffer()], file.fileName, {
    type: file.mimeType,
  });
}

async function downloadStoredOutput(
  file: StoredConversionJobFile,
): Promise<StoredConversionOutput | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !file.storagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(JOB_STORAGE_BUCKET)
    .download(file.storagePath);

  if (error || !data) {
    return null;
  }

  return {
    id: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
    storagePath: file.storagePath,
    buffer: Buffer.from(await data.arrayBuffer()),
  };
}

export function serializeJob(job: ConversionJobRecord) {
  const downloadUrl =
    job.status === "finished" ? `/api/v1/jobs/${job.id}/download` : null;

  return {
    data: {
      ...job,
      downloadUrl,
    },
  };
}

function canAccessJob(job: StoredConversionJob, identity?: ConversionApiIdentity) {
  if (!identity || identity.type === "development") {
    return true;
  }

  return (
    Boolean(job.apiKeyId && job.apiKeyId === identity.apiKeyId) ||
    Boolean(job.userId && job.userId === identity.userId)
  );
}

function assertCanAccessJob(
  job: StoredConversionJob,
  identity?: ConversionApiIdentity,
) {
  if (!canAccessJob(job, identity)) {
    throw new ConversionJobError("Conversion job was not found.", 404);
  }
}

export async function createConversionJob(
  formData: FormData,
  identity: ConversionApiIdentity,
) {
  const jobRequest = parseJobPayload(formData.get("job"));
  const convertTask = getConvertTask(jobRequest);
  const tool = getConversionTool(convertTask);
  const engineName = getTaskEngine(convertTask);
  const normalizedOutputFormat = convertTask.output_format.trim().toLowerCase();

  if (!isSupportedOutputFormat(tool, normalizedOutputFormat)) {
    throw new ConversionJobError("Unsupported output format.");
  }

  if (!canEngineHandleTool(engineName, tool)) {
    throw new ConversionJobError("The requested engine does not support this tool.");
  }

  if (!isConversionEngineImplemented(engineName)) {
    throw new ConversionJobError("The requested conversion engine is not installed.", 501);
  }

  const entries = formData.getAll("files");
  const files = entries.filter((entry): entry is File => entry instanceof File);

  if (entries.length !== files.length) {
    throw new ConversionJobError("One or more uploaded files are invalid.");
  }

  validateFiles(files, tool);

  const inlineEngine = getConversionEngine(engineName);
  const workerEngineAvailable = isWorkerConversionEngine(engineName);

  if (!inlineEngine && !workerEngineAvailable) {
    throw new ConversionJobError("Requested conversion engine is not available.");
  }

  if (getProcessingMode() === "inline" && workerEngineAvailable) {
    throw new ConversionJobError(
      "This conversion requires queued worker processing.",
      409,
    );
  }

  convertTask.tool = tool;
  convertTask.engine = engineName;
  convertTask.output_format = normalizedOutputFormat;
  convertTask.options = normalizeTaskOptions(tool, convertTask.options);

  const job = createJob(files, convertTask, identity);
  await uploadInputs(job);
  await persistJob(job);
  await persistInputFiles(job);

  if (getProcessingMode() === "inline") {
    await processConversionJob(job.id);
  }

  return toPublicJob(job);
}

export async function getConversionJob(
  jobId: string,
  identity?: ConversionApiIdentity,
) {
  const job = conversionJobs.get(jobId);
  const storedJob = job ?? await loadStoredJob(jobId);

  if (storedJob) {
    assertCanAccessJob(storedJob, identity);

    if (new Date(storedJob.expiresAt).getTime() <= Date.now()) {
      return null;
    }
  }

  return storedJob ? toPublicJob(storedJob) : null;
}

export async function getConversionJobOutputs(
  jobId: string,
  identity?: ConversionApiIdentity,
): Promise<StoredConversionOutput[] | null> {
  const job = conversionJobs.get(jobId);

  if (job?.status === "finished") {
    assertCanAccessJob(job, identity);
    return new Date(job.expiresAt).getTime() > Date.now() ? job.outputs : null;
  }

  const storedJob = await loadStoredJob(jobId);

  if (!storedJob || storedJob.status !== "finished") {
    return null;
  }

  if (new Date(storedJob.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  assertCanAccessJob(storedJob, identity);

  const outputs = await Promise.all(
    storedJob.outputFiles.map((file) => downloadStoredOutput(file)),
  );
  const availableOutputs = outputs.filter((file): file is StoredConversionOutput =>
    Boolean(file),
  );

  return availableOutputs.length ? availableOutputs : null;
}

async function loadJobForProcessing(jobId: string) {
  return conversionJobs.get(jobId) ?? await loadStoredJob(jobId);
}

async function loadJobInputFiles(job: StoredConversionJob): Promise<File[]> {
  if (job.inputUploads.length) {
    return job.inputUploads;
  }

  const files = await Promise.all(
    job.inputFiles.map((file) => downloadStoredInput(file)),
  );
  const availableFiles = files.filter((file): file is File => Boolean(file));

  if (availableFiles.length !== job.inputFiles.length) {
    throw new ConversionJobError("One or more input files are unavailable.", 404);
  }

  return availableFiles;
}

export async function processConversionJob(jobId: string) {
  const job = await loadJobForProcessing(jobId);

  if (!job) {
    throw new ConversionJobError("Conversion job was not found.", 404);
  }

  if (job.status === "finished") {
    return toPublicJob(job);
  }

  if (job.status !== "queued" && job.status !== "processing") {
    throw new ConversionJobError("Conversion job is not queued.", 409);
  }

  const engine = getConversionEngine(job.convertTask.engine);

  if (!engine) {
    throw new ConversionJobError(
      "This conversion must be processed by an external worker.",
      409,
    );
  }

  if (!isImageOutputFormat(job.convertTask.output_format)) {
    throw new ConversionJobError("Unsupported inline output format.");
  }

  const outputFormat = job.convertTask.output_format;

  if (job.status === "queued") {
    job.status = "processing";
    job.updatedAt = nowIso();
    await persistJobStatus(job);
  }

  try {
    const inputFiles = await loadJobInputFiles(job);
    const convertedOutputs = await engine.convert(
      inputFiles,
      outputFormat,
      getOutputOptions(job.convertTask.options),
    );
    const outputs = await uploadOutputs(job.id, convertedOutputs);
    job.outputs = outputs;
    job.outputFiles = outputs.map((output) => ({
      id: output.id,
      fileName: output.fileName,
      mimeType: output.mimeType || getOutputMimeType(outputFormat),
      size: output.size,
      storagePath: output.storagePath ?? null,
    }));
    job.status = "finished";
    job.updatedAt = nowIso();
    await persistOutputFiles(job);
    await persistJobStatus(job);
    await recordUsageEvent(job);
  } catch (error) {
    const capacityExceeded = error instanceof CapacityExceededError;
    job.status = capacityExceeded ? "queued" : "failed";
    job.error = capacityExceeded
      ? null
      : error instanceof Error
        ? error.message
        : "Conversion failed.";
    job.updatedAt = nowIso();
    await persistJobStatus(job);
  }

  return toPublicJob(job);
}

export async function processNextQueuedConversionJob() {
  const job = await loadNextQueuedJob();

  if (!job) {
    return null;
  }

  return processConversionJob(job.id);
}

export async function claimNextWorkerConversionJob(
  tools: ConversionToolName[] = [],
) {
  const job = await loadNextQueuedWorkerJob(tools);

  if (!job) {
    return null;
  }

  if (job.status !== "processing") {
    throw new ConversionJobError("Conversion job is not queued.", 409);
  }

  return serializeWorkerJob(job);
}

export async function getWorkerJobInputFile(jobId: string, fileId: string) {
  const job = await loadJobForProcessing(jobId);

  if (!job || !isWorkerJob(job)) {
    throw new ConversionJobError("Conversion job was not found.", 404);
  }

  if (job.status !== "processing") {
    throw new ConversionJobError("Conversion job has not been claimed.", 409);
  }

  const inputFileIndex = job.inputFiles.findIndex((file) => file.id === fileId);

  if (inputFileIndex < 0) {
    throw new ConversionJobError("Input file was not found.", 404);
  }

  const uploadedFile = job.inputUploads[inputFileIndex];

  if (uploadedFile) {
    return uploadedFile;
  }

  const storedFile = await downloadStoredInput(job.inputFiles[inputFileIndex]);

  if (!storedFile) {
    throw new ConversionJobError("Input file is unavailable.", 404);
  }

  return storedFile;
}

export async function completeWorkerConversionJob(
  jobId: string,
  files: File[],
) {
  const job = await loadJobForProcessing(jobId);

  if (!job || !isWorkerJob(job)) {
    throw new ConversionJobError("Conversion job was not found.", 404);
  }

  if (job.status !== "processing") {
    throw new ConversionJobError("Conversion job is not processing.", 409);
  }

  if (!files.length) {
    throw new ConversionJobError("At least one output file is required.");
  }

  if (files.length > MAX_WORKER_OUTPUT_FILES) {
    throw new ConversionJobError("The worker returned too many output files.", 413);
  }

  const totalOutputBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalOutputBytes > MAX_WORKER_OUTPUT_BYTES) {
    throw new ConversionJobError("The worker output exceeds the job limit.", 413);
  }

  for (const file of files) {
    if (
      !file.name ||
      file.name.length > 180 ||
      /[\\/\u0000-\u001f]/.test(file.name)
    ) {
      throw new ConversionJobError("The worker returned an invalid file name.");
    }
  }

  const convertedOutputs = await Promise.all(
    files.map(async (file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      buffer: Buffer.from(await file.arrayBuffer()),
    })),
  );
  const outputs = await uploadOutputs(job.id, convertedOutputs);

  job.outputs = outputs;
  job.outputFiles = outputs.map((output) => ({
    id: output.id,
    fileName: output.fileName,
    mimeType: output.mimeType,
    size: output.size,
    storagePath: output.storagePath ?? null,
  }));
  job.status = "finished";
  job.error = null;
  job.updatedAt = nowIso();

  await persistOutputFiles(job);
  await persistJobStatus(job);
  await recordUsageEvent(job);

  return toPublicJob(job);
}

export async function failWorkerConversionJob(
  jobId: string,
  message: string,
) {
  const job = await loadJobForProcessing(jobId);

  if (!job || !isWorkerJob(job)) {
    throw new ConversionJobError("Conversion job was not found.", 404);
  }

  if (job.status === "finished") {
    throw new ConversionJobError("Finished jobs cannot be marked failed.", 409);
  }

  job.status = "failed";
  job.error = message.slice(0, 500) || "Conversion failed.";
  job.updatedAt = nowIso();
  await persistJobStatus(job);

  return toPublicJob(job);
}

export function getConversionJobError(error: unknown) {
  if (error instanceof ConversionJobError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  return {
    message: "The conversion job could not be created.",
    statusCode: 500,
  };
}
