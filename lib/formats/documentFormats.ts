export type DocumentFormat =
  | "ABW"
  | "DJVU"
  | "DOC"
  | "DOCM"
  | "DOCX"
  | "DOT"
  | "DOTX"
  | "HTML"
  | "HWP"
  | "HWPX"
  | "LWP"
  | "MD"
  | "ODT"
  | "PAGES"
  | "PDF"
  | "RST"
  | "RTF"
  | "SDW"
  | "TEX"
  | "TXT"
  | "WPD"
  | "WPS"
  | "ZABW";

export const documentFormats: DocumentFormat[] = [
  "ABW",
  "DJVU",
  "DOC",
  "DOCM",
  "DOCX",
  "DOT",
  "DOTX",
  "HTML",
  "HWP",
  "HWPX",
  "LWP",
  "MD",
  "ODT",
  "PAGES",
  "PDF",
  "RST",
  "RTF",
  "SDW",
  "TEX",
  "TXT",
  "WPD",
  "WPS",
  "ZABW",
];

export const documentFormatCategories = [
  {
    label: "Common",
    formats: ["PDF", "DOCX", "TXT", "RTF", "ODT", "HTML", "MD"] satisfies DocumentFormat[],
  },
  {
    label: "Microsoft Office",
    formats: ["DOC", "DOCM", "DOCX", "DOT", "DOTX"] satisfies DocumentFormat[],
  },
  {
    label: "Open formats",
    formats: ["ODT", "RTF", "TXT", "HTML", "MD", "RST", "TEX"] satisfies DocumentFormat[],
  },
  {
    label: "Publishing",
    formats: ["PDF", "DJVU", "PAGES"] satisfies DocumentFormat[],
  },
  {
    label: "Legacy",
    formats: ["ABW", "HWP", "HWPX", "LWP", "SDW", "WPD", "WPS", "ZABW"] satisfies DocumentFormat[],
  },
];

export const supportedDocumentAccept = documentFormats
  .map((format) => `.${format.toLowerCase()}`)
  .join(",");
