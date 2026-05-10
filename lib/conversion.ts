import sharp from "sharp";
import { MAX_IMAGE_PIXELS } from "@/lib/constants";
import { getOutputMimeType, replaceFileExtension } from "@/lib/format";
import { OutputFormat, OutputOptions } from "@/types/converter";

export type ConvertedImage = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

type SharpTransformer = (image: sharp.Sharp, options: OutputOptions) => sharp.Sharp;

function buildTransformer(format: OutputFormat): SharpTransformer | null {
  switch (format) {
    case "avif":
      return (image, options) => image.avif({ quality: options.quality });
    case "bmp":
      return null;
    case "gif":
      return (image) => image.gif();
    case "ico":
      return null;
    case "png":
      return (image) => image.png();
    case "jpg":
      return (image, options) =>
        image
          .flatten({ background: options.backgroundColor })
          .jpeg({ quality: options.quality });
    case "tiff":
      return (image, options) => image.tiff({ quality: options.quality });
    case "webp":
      return (image, options) => image.webp({ quality: options.quality });
  }
}

function applyCommonOptions(image: sharp.Sharp, options: OutputOptions): sharp.Sharp {
  const resized =
    options.width || options.height
      ? image.resize(options.width, options.height, {
          fit: "inside",
          withoutEnlargement: true,
        })
      : image;

  return options.keepMetadata ? resized.keepMetadata() : resized;
}

function encodeBmpFromRgba(rgba: Buffer, width: number, height: number): Buffer {
  const bytesPerPixel = 3;
  const rowStride = (width * bytesPerPixel + 3) & ~3;
  const pixelDataSize = rowStride * height;
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  const pixelOffset = fileHeaderSize + dibHeaderSize;
  const fileSize = pixelOffset + pixelDataSize;
  const bmp = Buffer.alloc(fileSize);

  bmp.write("BM", 0, "ascii");
  bmp.writeUInt32LE(fileSize, 2);
  bmp.writeUInt32LE(pixelOffset, 10);

  bmp.writeUInt32LE(dibHeaderSize, 14);
  bmp.writeInt32LE(width, 18);
  bmp.writeInt32LE(height, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(24, 28);
  bmp.writeUInt32LE(0, 30);
  bmp.writeUInt32LE(pixelDataSize, 34);
  bmp.writeInt32LE(2835, 38);
  bmp.writeInt32LE(2835, 42);
  bmp.writeUInt32LE(0, 46);
  bmp.writeUInt32LE(0, 50);

  for (let y = 0; y < height; y += 1) {
    const srcRow = (height - 1 - y) * width * 4;
    const dstRow = pixelOffset + y * rowStride;

    for (let x = 0; x < width; x += 1) {
      const srcIndex = srcRow + x * 4;
      const dstIndex = dstRow + x * 3;
      bmp[dstIndex] = rgba[srcIndex + 2];
      bmp[dstIndex + 1] = rgba[srcIndex + 1];
      bmp[dstIndex + 2] = rgba[srcIndex];
    }
  }

  return bmp;
}

function encodeIcoFromPng(png: Buffer, width: number, height: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directoryEntry = Buffer.alloc(16);
  directoryEntry.writeUInt8(width >= 256 ? 0 : width, 0);
  directoryEntry.writeUInt8(height >= 256 ? 0 : height, 1);
  directoryEntry.writeUInt8(0, 2);
  directoryEntry.writeUInt8(0, 3);
  directoryEntry.writeUInt16LE(1, 4);
  directoryEntry.writeUInt16LE(32, 6);
  directoryEntry.writeUInt32LE(png.length, 8);
  directoryEntry.writeUInt32LE(6 + 16, 12);

  return Buffer.concat([header, directoryEntry, png]);
}

export function createUniqueOutputName(
  fileName: string,
  format: OutputFormat,
  usedNames: Set<string>,
) {
  const initialName = replaceFileExtension(fileName, format);

  if (!usedNames.has(initialName)) {
    usedNames.add(initialName);
    return initialName;
  }

  const extension = `.${format}`;
  const baseName = initialName.slice(0, -extension.length);
  let duplicateIndex = 2;
  let candidateName = `${baseName}-${duplicateIndex}${extension}`;

  while (usedNames.has(candidateName)) {
    duplicateIndex += 1;
    candidateName = `${baseName}-${duplicateIndex}${extension}`;
  }

  usedNames.add(candidateName);
  return candidateName;
}

export async function validateImageContent(buffer: Buffer): Promise<void> {
  const metadata = await sharp(buffer, { failOn: "error" }).metadata();

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error("Missing image metadata.");
  }

  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new Error("Image dimensions are too large.");
  }
}

export async function convertImageBuffer(
  inputBuffer: Buffer,
  outputFormat: OutputFormat,
  options: OutputOptions,
): Promise<Buffer> {
  const image = applyCommonOptions(
    sharp(inputBuffer, { failOn: "error" }),
    options,
  );
  const transformer = buildTransformer(outputFormat);

  if (transformer) {
    return transformer(image, options).toBuffer();
  }

  if (outputFormat === "bmp") {
    const { data, info } = await image
      .flatten({ background: options.backgroundColor })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return encodeBmpFromRgba(data, info.width, info.height);
  }

  const { data, info } = await image
    .resize(256, 256, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });

  return encodeIcoFromPng(data, info.width, info.height);
}

export async function convertUploadedFile(
  file: File,
  outputFormat: OutputFormat,
  outputOptions: OutputOptions,
  usedNames: Set<string>,
): Promise<ConvertedImage> {
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  await validateImageContent(inputBuffer);

  const buffer = await convertImageBuffer(inputBuffer, outputFormat, outputOptions);

  return {
    fileName: createUniqueOutputName(file.name, outputFormat, usedNames),
    mimeType: getOutputMimeType(outputFormat),
    buffer,
  };
}
