export type ConverterToolSection =
  | "Convert files"
  | "Optimize files"
  | "PDF tools"
  | "Archive tools"
  | "Website tools";

export type ConverterToolStatus = "ready" | "coming-soon";

export type ConverterTool = {
  id: string;
  name: string;
  route: string;
  section: ConverterToolSection;
  icon: string;
  status: ConverterToolStatus;
  title: string;
  subtitle: string;
  formats: string[];
};

export const converterToolSections: ConverterToolSection[] = [
  "Convert files",
  "Optimize files",
  "PDF tools",
  "Archive tools",
  "Website tools",
];

export const converterTools: ConverterTool[] = [
  {
    id: "image-converter",
    name: "Image Converter",
    route: "/tools/image-converter",
    section: "Convert files",
    icon: "image",
    status: "ready",
    title: "Image Converter",
    subtitle: "Convert images to another format.",
    formats: ["PNG", "JPG", "WEBP", "AVIF", "TIFF"],
  },
  {
    id: "video-converter",
    name: "Video Converter",
    route: "/tools/video-converter",
    section: "Convert files",
    icon: "video",
    status: "ready",
    title: "Video Converter",
    subtitle: "Convert videos to another format.",
    formats: ["MP4", "MOV", "MKV", "WEBM", "AVI"],
  },
  {
    id: "audio-converter",
    name: "Audio Converter",
    route: "/tools/audio-converter",
    section: "Convert files",
    icon: "audio",
    status: "ready",
    title: "Audio Converter",
    subtitle: "Convert audio files to another format.",
    formats: ["MP3", "WAV", "M4A", "FLAC", "AAC"],
  },
  {
    id: "document-converter",
    name: "Document Converter",
    route: "/tools/document-converter",
    section: "Convert files",
    icon: "document",
    status: "ready",
    title: "Document Converter",
    subtitle: "Convert documents to another format.",
    formats: ["PDF", "DOCX", "TXT", "RTF", "ODT"],
  },
  {
    id: "spreadsheet-converter",
    name: "Spreadsheet Converter",
    route: "/tools/spreadsheet-converter",
    section: "Convert files",
    icon: "spreadsheet",
    status: "ready",
    title: "Spreadsheet Converter",
    subtitle: "Convert spreadsheets to another format.",
    formats: ["XLSX", "CSV", "ODS", "XLS", "TSV"],
  },
  {
    id: "presentation-converter",
    name: "Presentation Converter",
    route: "/tools/presentation-converter",
    section: "Convert files",
    icon: "presentation",
    status: "coming-soon",
    title: "Presentation Converter",
    subtitle: "Convert presentations to another format.",
    formats: ["PPTX", "PPT", "ODP", "PDF", "KEY"],
  },
  {
    id: "archive-converter",
    name: "Archive Converter",
    route: "/tools/archive-converter",
    section: "Convert files",
    icon: "archive",
    status: "ready",
    title: "Archive Converter",
    subtitle: "Convert archive files to another format.",
    formats: ["ZIP", "7Z", "RAR", "TAR", "GZ"],
  },
  {
    id: "ebook-converter",
    name: "Ebook Converter",
    route: "/tools/ebook-converter",
    section: "Convert files",
    icon: "ebook",
    status: "coming-soon",
    title: "Ebook Converter",
    subtitle: "Convert ebooks to readable formats.",
    formats: ["EPUB", "MOBI", "AZW3", "PDF", "FB2"],
  },
  {
    id: "font-converter",
    name: "Font Converter",
    route: "/tools/font-converter",
    section: "Convert files",
    icon: "font",
    status: "coming-soon",
    title: "Font Converter",
    subtitle: "Convert fonts for web and design use.",
    formats: ["TTF", "OTF", "WOFF", "WOFF2", "EOT"],
  },
  {
    id: "vector-converter",
    name: "Vector Converter",
    route: "/tools/vector-converter",
    section: "Convert files",
    icon: "vector",
    status: "coming-soon",
    title: "Vector Converter",
    subtitle: "Convert vector files for design and web use.",
    formats: ["SVG", "EPS", "AI", "PDF", "DXF"],
  },
  {
    id: "cad-converter",
    name: "CAD Converter",
    route: "/tools/cad-converter",
    section: "Convert files",
    icon: "cad",
    status: "coming-soon",
    title: "CAD Converter",
    subtitle: "Convert CAD files for design and technical workflows.",
    formats: ["DWG", "DXF", "STL", "STEP", "IGES"],
  },
  {
    id: "compress-pdf",
    name: "Compress PDF",
    route: "/tools/compress-pdf",
    section: "Optimize files",
    icon: "compress",
    status: "ready",
    title: "Compress PDF",
    subtitle: "Reduce PDF file size while keeping it readable.",
    formats: ["PDF"],
  },
  {
    id: "compress-png",
    name: "Compress PNG",
    route: "/tools/compress-png",
    section: "Optimize files",
    icon: "compress-image",
    status: "ready",
    title: "Compress PNG",
    subtitle: "Reduce PNG image size without making it hard to view.",
    formats: ["PNG"],
  },
  {
    id: "compress-jpg",
    name: "Compress JPG",
    route: "/tools/compress-jpg",
    section: "Optimize files",
    icon: "compress-image",
    status: "ready",
    title: "Compress JPG",
    subtitle: "Reduce JPG file size for faster sharing.",
    formats: ["JPG", "JPEG"],
  },
  {
    id: "pdf-ocr",
    name: "PDF OCR",
    route: "/tools/pdf-ocr",
    section: "Optimize files",
    icon: "ocr",
    status: "coming-soon",
    title: "PDF OCR",
    subtitle: "Make scanned PDFs searchable and easier to copy.",
    formats: ["PDF", "JPG", "PNG", "TIFF"],
  },
  {
    id: "merge-pdf",
    name: "Merge PDF",
    route: "/tools/merge-pdf",
    section: "PDF tools",
    icon: "merge",
    status: "ready",
    title: "Merge PDF",
    subtitle: "Combine multiple PDF files into one.",
    formats: ["PDF"],
  },
  {
    id: "create-archive",
    name: "Create Archive",
    route: "/tools/create-archive",
    section: "Archive tools",
    icon: "archive-plus",
    status: "ready",
    title: "Create Archive",
    subtitle: "Package multiple files into one archive.",
    formats: ["ZIP", "7Z", "TAR"],
  },
  {
    id: "extract-archive",
    name: "Extract Archive",
    route: "/tools/extract-archive",
    section: "Archive tools",
    icon: "archive-extract",
    status: "ready",
    title: "Extract Archive",
    subtitle: "Open and extract files from an archive.",
    formats: ["ZIP", "RAR", "7Z", "TAR", "GZ"],
  },
  {
    id: "website-to-pdf",
    name: "Website to PDF",
    route: "/tools/website-to-pdf",
    section: "Website tools",
    icon: "website-pdf",
    status: "ready",
    title: "Website to PDF",
    subtitle: "Save a webpage as a PDF.",
    formats: ["URL", "PDF"],
  },
  {
    id: "website-screenshot",
    name: "Website Screenshot",
    route: "/tools/website-screenshot",
    section: "Website tools",
    icon: "screenshot",
    status: "ready",
    title: "Website Screenshot",
    subtitle: "Capture a webpage as an image.",
    formats: ["URL", "PNG", "JPG"],
  },
];

export function getToolsBySection(section: ConverterToolSection) {
  return converterTools.filter((tool) => tool.section === section);
}

export function getToolById(id: string) {
  return converterTools.find((tool) => tool.id === id);
}
