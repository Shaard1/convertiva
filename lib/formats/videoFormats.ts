export type VideoFormat =
  | "3G2"
  | "3GP"
  | "3GPP"
  | "AVI"
  | "CAVS"
  | "DV"
  | "DVR"
  | "FLV"
  | "M2TS"
  | "M4V"
  | "MKV"
  | "MOD"
  | "MOV"
  | "MP4"
  | "MPEG"
  | "MPG"
  | "MTS"
  | "MXF"
  | "OGG"
  | "OGV"
  | "RM"
  | "RMVB"
  | "SWF"
  | "TS"
  | "VOB"
  | "WEBM"
  | "WMV"
  | "WTV";

export const videoFormats: VideoFormat[] = [
  "3G2",
  "3GP",
  "3GPP",
  "AVI",
  "CAVS",
  "DV",
  "DVR",
  "FLV",
  "M2TS",
  "M4V",
  "MKV",
  "MOD",
  "MOV",
  "MP4",
  "MPEG",
  "MPG",
  "MTS",
  "MXF",
  "OGG",
  "OGV",
  "RM",
  "RMVB",
  "SWF",
  "TS",
  "VOB",
  "WEBM",
  "WMV",
  "WTV",
];

export const videoFormatCategories = [
  {
    label: "Common",
    formats: ["MP4", "MOV", "MKV", "AVI", "WEBM", "WMV"] satisfies VideoFormat[],
  },
  {
    label: "Web",
    formats: ["MP4", "WEBM", "OGV", "OGG"] satisfies VideoFormat[],
  },
  {
    label: "Mobile",
    formats: ["3GP", "3G2", "3GPP", "M4V", "MP4"] satisfies VideoFormat[],
  },
  {
    label: "Professional",
    formats: ["MOV", "MXF", "MTS", "M2TS", "DV"] satisfies VideoFormat[],
  },
  {
    label: "Legacy",
    formats: [
      "AVI",
      "FLV",
      "MPG",
      "MPEG",
      "RM",
      "RMVB",
      "SWF",
      "VOB",
      "WMV",
      "WTV",
      "MOD",
      "DVR",
      "CAVS",
      "TS",
    ] satisfies VideoFormat[],
  },
];

export const supportedVideoAccept = videoFormats
  .map((format) => `.${format.toLowerCase()}`)
  .join(",");
