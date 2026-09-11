import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Box,
  Braces,
  Combine,
  FileArchive,
  FileImage,
  FileScan,
  FileText,
  FileType,
  ImageDown,
  Layers3,
  Maximize2,
  Music,
  PanelTop,
  Presentation,
  Sheet,
  Video,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  archive: FileArchive,
  "archive-extract": ArchiveRestore,
  "archive-plus": Archive,
  audio: Music,
  cad: Box,
  compress: Maximize2,
  "compress-image": ImageDown,
  document: FileText,
  ebook: BookOpen,
  font: FileType,
  image: FileImage,
  merge: Combine,
  ocr: FileScan,
  presentation: Presentation,
  screenshot: PanelTop,
  spreadsheet: Sheet,
  vector: Braces,
  video: Video,
  "website-pdf": Layers3,
};

export function ConverterToolIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = iconMap[icon] ?? FileText;
  return <Icon className={className} />;
}
