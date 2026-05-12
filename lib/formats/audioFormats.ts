export type AudioFormat =
  | "AAC"
  | "AC3"
  | "AIF"
  | "AIFC"
  | "AIFF"
  | "AMR"
  | "AU"
  | "CAF"
  | "DSS"
  | "FLAC"
  | "M4A"
  | "M4B"
  | "MP3"
  | "OGA"
  | "OPUS"
  | "SF2"
  | "SFARK"
  | "VOC"
  | "WAV"
  | "WEBA"
  | "WMA";

export const audioFormats: AudioFormat[] = [
  "AAC",
  "AC3",
  "AIF",
  "AIFC",
  "AIFF",
  "AMR",
  "AU",
  "CAF",
  "DSS",
  "FLAC",
  "M4A",
  "M4B",
  "MP3",
  "OGA",
  "OPUS",
  "SF2",
  "SFARK",
  "VOC",
  "WAV",
  "WEBA",
  "WMA",
];

export const audioFormatCategories = [
  {
    label: "Common",
    formats: ["MP3", "WAV", "M4A", "FLAC", "AAC", "OPUS", "WMA"] satisfies AudioFormat[],
  },
  {
    label: "Lossless",
    formats: ["WAV", "FLAC", "AIFF", "AIF", "AIFC"] satisfies AudioFormat[],
  },
  {
    label: "Mobile",
    formats: ["M4A", "M4B", "AAC", "AMR", "MP3"] satisfies AudioFormat[],
  },
  {
    label: "Web",
    formats: ["MP3", "OGA", "OPUS", "WEBA"] satisfies AudioFormat[],
  },
  {
    label: "Legacy",
    formats: ["AC3", "AU", "CAF", "DSS", "VOC", "WMA"] satisfies AudioFormat[],
  },
  {
    label: "Sound fonts",
    formats: ["SF2", "SFARK"] satisfies AudioFormat[],
  },
];

export const supportedAudioAccept = audioFormats
  .map((format) => `.${format.toLowerCase()}`)
  .join(",");
