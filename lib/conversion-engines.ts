import { convertUploadedFile } from "@/lib/conversion";
import { OutputFormat, OutputOptions } from "@/types/converter";
import {
  ConversionEngineName,
  ConversionToolName,
  StoredConversionOutput,
} from "@/types/conversion-platform";

type ConversionEngine = {
  name: ConversionEngineName;
  mode: "inline";
  tool: ConversionToolName;
  supportedOperations: readonly ["convert"];
  convert: (
    files: File[],
    outputFormat: OutputFormat,
    options: OutputOptions,
  ) => Promise<StoredConversionOutput[]>;
};

const sharpEngine: ConversionEngine = {
  name: "sharp",
  mode: "inline",
  tool: "image",
  supportedOperations: ["convert"],
  async convert(files, outputFormat, options) {
    const usedNames = new Set<string>();
    const convertedFiles = await Promise.all(
      files.map((file) => convertUploadedFile(file, outputFormat, options, usedNames)),
    );

    return convertedFiles.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.buffer.byteLength,
      buffer: file.buffer,
    }));
  },
};

const conversionEngines = new Map<ConversionEngineName, ConversionEngine>([
  [sharpEngine.name, sharpEngine],
]);

const workerEngines = [
  {
    name: "ffmpeg",
    mode: "worker",
    implemented: true,
    tools: ["video", "audio"],
    supportedOperations: ["convert"],
  },
  {
    name: "libreoffice",
    mode: "worker",
    implemented: false,
    tools: ["document"],
    supportedOperations: ["convert"],
  },
  {
    name: "sevenzip",
    mode: "worker",
    implemented: false,
    tools: ["archive"],
    supportedOperations: ["convert"],
  },
] satisfies Array<{
  name: ConversionEngineName;
  mode: "worker";
  implemented: boolean;
  tools: ConversionToolName[];
  supportedOperations: ["convert"];
}>; 

const conversionEngineNames = new Set<ConversionEngineName>([
  ...conversionEngines.keys(),
  ...workerEngines.map((engine) => engine.name),
  "imagemagick",
]);

export function isConversionEngineName(
  value: unknown,
): value is ConversionEngineName {
  return typeof value === "string" && conversionEngineNames.has(value as ConversionEngineName);
}

export function getConversionEngine(name: ConversionEngineName = "sharp") {
  return conversionEngines.get(name) ?? null;
}

export function isWorkerConversionEngine(name: ConversionEngineName) {
  return workerEngines.some((engine) => engine.name === name);
}

export function canEngineHandleTool(
  name: ConversionEngineName,
  tool: ConversionToolName,
) {
  const inlineEngine = conversionEngines.get(name);

  if (inlineEngine) {
    return inlineEngine.tool === tool;
  }

  return workerEngines.some(
    (engine) =>
      engine.name === name &&
      (engine.tools as readonly ConversionToolName[]).includes(tool),
  );
}

export function isConversionEngineImplemented(name: ConversionEngineName) {
  if (conversionEngines.has(name)) {
    return true;
  }

  return workerEngines.some(
    (engine) => engine.name === name && engine.implemented,
  );
}

export function listConversionEngines() {
  const inlineEngines = Array.from(conversionEngines.values()).map((engine) => ({
    name: engine.name,
    mode: engine.mode,
    tools: [engine.tool],
    supportedOperations: engine.supportedOperations,
  }));

  return [
    ...inlineEngines.map((engine) => ({ ...engine, implemented: true })),
    ...workerEngines,
  ];
}
