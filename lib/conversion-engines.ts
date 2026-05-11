import { convertUploadedFile } from "@/lib/conversion";
import { OutputFormat, OutputOptions } from "@/types/converter";
import {
  ConversionEngineName,
  StoredConversionOutput,
} from "@/types/conversion-platform";

type ConversionEngine = {
  name: ConversionEngineName;
  supportedOperations: readonly ["convert"];
  convert: (
    files: File[],
    outputFormat: OutputFormat,
    options: OutputOptions,
  ) => Promise<StoredConversionOutput[]>;
};

const sharpEngine: ConversionEngine = {
  name: "sharp",
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

export function getConversionEngine(name: ConversionEngineName = "sharp") {
  return conversionEngines.get(name) ?? null;
}

export function listConversionEngines() {
  return Array.from(conversionEngines.values()).map((engine) => ({
    name: engine.name,
    supportedOperations: engine.supportedOperations,
  }));
}
