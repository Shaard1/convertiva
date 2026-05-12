export type WorkingToolStep = {
  title: string;
  description: string;
};

export type WorkingToolConfig = {
  toolId:
    | "compress-pdf"
    | "merge-pdf"
    | "create-archive"
    | "extract-archive"
    | "archive-converter"
    | "spreadsheet-converter"
    | "compress-jpg"
    | "compress-png"
    | "website-to-pdf"
    | "website-screenshot";
  apiRoute: string;
  inputMode: "single-file" | "multi-file" | "url";
  accept?: string;
  allowMultiple?: boolean;
  maxFiles?: number;
  outputFormats?: { value: string; label: string }[];
  uploadTitle: string;
  uploadSubtitle: string;
  selectButtonLabel: string;
  convertButtonLabel: string;
  idleHelperText: string;
  processingHelperText: string;
  resultLabel: string;
  urlPlaceholder?: string;
  steps: WorkingToolStep[];
};

export const workingToolConfigs: Record<WorkingToolConfig["toolId"], WorkingToolConfig> = {
  "archive-converter": {
    toolId: "archive-converter",
    apiRoute: "/api/archive-converter",
    inputMode: "single-file",
    accept: ".zip,.7z,.rar,.tar,.gz,.tgz,application/zip,application/x-zip-compressed,application/x-7z-compressed,application/x-rar-compressed,application/x-tar,application/gzip",
    outputFormats: [
      { value: "zip", label: "ZIP" },
      { value: "7z", label: "7Z" },
      { value: "tar", label: "TAR" },
    ],
    uploadTitle: "Upload your archive",
    uploadSubtitle: "Add one archive file, then choose the format you want back.",
    selectButtonLabel: "Select archive",
    convertButtonLabel: "Convert archive",
    idleHelperText: "Upload one supported archive file to start.",
    processingHelperText: "Archive conversion may take more time for larger file sets.",
    resultLabel: "Converted archive is ready.",
    steps: [
      { title: "Upload your archive", description: "Choose one supported archive file such as ZIP, 7Z, RAR, or TAR." },
      { title: "Choose the output format", description: "Pick the archive format you want back before starting the conversion." },
      { title: "Convert and download", description: "The tool extracts the archive safely, rebuilds it, and prepares it for download." },
    ],
  },
  "spreadsheet-converter": {
    toolId: "spreadsheet-converter",
    apiRoute: "/api/spreadsheet-converter",
    inputMode: "single-file",
    accept: ".xlsx,.xls,.csv,.tsv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet",
    outputFormats: [
      { value: "xlsx", label: "XLSX" },
      { value: "xls", label: "XLS" },
      { value: "csv", label: "CSV" },
      { value: "tsv", label: "TSV" },
      { value: "ods", label: "ODS" },
    ],
    uploadTitle: "Upload your spreadsheet",
    uploadSubtitle: "Add one spreadsheet file, then choose the format you want back.",
    selectButtonLabel: "Select spreadsheet",
    convertButtonLabel: "Convert spreadsheet",
    idleHelperText: "Upload one XLSX, XLS, CSV, TSV, or ODS file to start.",
    processingHelperText: "CSV and TSV exports use the first sheet when a workbook has multiple sheets.",
    resultLabel: "Converted spreadsheet is ready.",
    steps: [
      { title: "Upload your spreadsheet", description: "Choose one spreadsheet file such as XLSX, XLS, CSV, TSV, or ODS." },
      { title: "Choose the output format", description: "Pick the spreadsheet format you want before starting the conversion." },
      { title: "Convert and download", description: "The file is rewritten into the new format and prepared for download." },
    ],
  },
  "compress-pdf": {
    toolId: "compress-pdf",
    apiRoute: "/api/compress-pdf",
    inputMode: "single-file",
    accept: ".pdf,application/pdf",
    uploadTitle: "Upload your PDF",
    uploadSubtitle: "Add one PDF file to reduce its file size.",
    selectButtonLabel: "Select PDF",
    convertButtonLabel: "Compress PDF",
    idleHelperText: "Upload one PDF file to start.",
    processingHelperText: "Compression keeps the document readable while reducing unnecessary weight where possible.",
    resultLabel: "Compressed PDF is ready.",
    steps: [
      { title: "Upload your PDF", description: "Choose one PDF file you want to compress." },
      { title: "Optimize the document", description: "The tool rewrites the PDF in a more compact form when it can reduce size safely." },
      { title: "Download the result", description: "Save the smaller PDF when the compression finishes." },
    ],
  },
  "merge-pdf": {
    toolId: "merge-pdf",
    apiRoute: "/api/merge-pdf",
    inputMode: "multi-file",
    accept: ".pdf,application/pdf",
    allowMultiple: true,
    maxFiles: 20,
    uploadTitle: "Upload your PDF files",
    uploadSubtitle: "Add the PDF files you want to combine.",
    selectButtonLabel: "Select PDFs",
    convertButtonLabel: "Merge PDFs",
    idleHelperText: "Upload at least two PDF files to start.",
    processingHelperText: "Larger PDF sets may take more time to process.",
    resultLabel: "Merged PDF is ready.",
    steps: [
      { title: "Upload your PDFs", description: "Choose the PDF files you want to combine into one document." },
      { title: "Review the file list", description: "Make sure the right PDFs are included before you start the merge." },
      { title: "Merge and download", description: "Run the merge, then download the finished PDF when it is ready." },
    ],
  },
  "create-archive": {
    toolId: "create-archive",
    apiRoute: "/api/create-archive",
    inputMode: "multi-file",
    allowMultiple: true,
    maxFiles: 40,
    uploadTitle: "Upload files for your archive",
    uploadSubtitle: "Add the files you want to package together.",
    selectButtonLabel: "Select files",
    convertButtonLabel: "Create archive",
    idleHelperText: "Upload one or more files to create a ZIP archive.",
    processingHelperText: "Bigger file sets may take more time to package.",
    resultLabel: "Archive is ready.",
    steps: [
      { title: "Upload your files", description: "Choose the files you want to bundle into one archive." },
      { title: "Check the file set", description: "Review the list so you know exactly what will go into the archive." },
      { title: "Create and download", description: "Build the archive, then download the ZIP file when it is ready." },
    ],
  },
  "extract-archive": {
    toolId: "extract-archive",
    apiRoute: "/api/extract-archive",
    inputMode: "single-file",
    accept: ".zip,application/zip,application/x-zip-compressed",
    uploadTitle: "Upload your archive",
    uploadSubtitle: "Add one ZIP archive to open and extract.",
    selectButtonLabel: "Select archive",
    convertButtonLabel: "Extract archive",
    idleHelperText: "Upload one ZIP archive to start.",
    processingHelperText: "Archives with many files may take more time to unpack.",
    resultLabel: "Extracted files are ready.",
    steps: [
      { title: "Upload your archive", description: "Choose one ZIP file you want to open." },
      { title: "Extract the contents", description: "The tool unpacks the archive and prepares the files for download." },
      { title: "Download the result", description: "If the archive has one file, download it directly. Otherwise download the extracted set." },
    ],
  },
  "compress-jpg": {
    toolId: "compress-jpg",
    apiRoute: "/api/compress-jpg",
    inputMode: "single-file",
    accept: ".jpg,.jpeg,image/jpeg",
    uploadTitle: "Upload your JPG",
    uploadSubtitle: "Add one JPG image to reduce its file size.",
    selectButtonLabel: "Select JPG",
    convertButtonLabel: "Compress JPG",
    idleHelperText: "Upload one JPG file to start.",
    processingHelperText: "Compression keeps the image easier to share while staying readable.",
    resultLabel: "Compressed JPG is ready.",
    steps: [
      { title: "Upload your JPG", description: "Choose one JPG file you want to compress." },
      { title: "Compress the image", description: "The tool reduces file size with sharing-friendly compression settings." },
      { title: "Download the result", description: "Save the smaller JPG when the compression finishes." },
    ],
  },
  "compress-png": {
    toolId: "compress-png",
    apiRoute: "/api/compress-png",
    inputMode: "single-file",
    accept: ".png,image/png",
    uploadTitle: "Upload your PNG",
    uploadSubtitle: "Add one PNG image to reduce its file size.",
    selectButtonLabel: "Select PNG",
    convertButtonLabel: "Compress PNG",
    idleHelperText: "Upload one PNG file to start.",
    processingHelperText: "Compression is tuned to keep the image clear while reducing weight.",
    resultLabel: "Compressed PNG is ready.",
    steps: [
      { title: "Upload your PNG", description: "Choose one PNG file you want to optimize." },
      { title: "Compress the image", description: "The tool reduces file size while preserving clean edges and readability." },
      { title: "Download the result", description: "Save the smaller PNG when the compression finishes." },
    ],
  },
  "website-screenshot": {
    toolId: "website-screenshot",
    apiRoute: "/api/website-screenshot",
    inputMode: "url",
    uploadTitle: "Enter a website URL",
    uploadSubtitle: "Add a public webpage link to capture it as an image.",
    selectButtonLabel: "",
    convertButtonLabel: "Capture screenshot",
    idleHelperText: "Enter a public website URL to start.",
    processingHelperText: "Busy pages may take a few extra seconds to load before capture.",
    resultLabel: "Website screenshot is ready.",
    urlPlaceholder: "https://example.com",
    steps: [
      { title: "Enter the website URL", description: "Paste the public webpage address you want to capture." },
      { title: "Load the page", description: "The tool opens the page in a browser environment and waits for it to render." },
      { title: "Capture and download", description: "Create the screenshot, then download the finished PNG image." },
    ],
  },
  "website-to-pdf": {
    toolId: "website-to-pdf",
    apiRoute: "/api/website-to-pdf",
    inputMode: "url",
    uploadTitle: "Enter a website URL",
    uploadSubtitle: "Add a public webpage link to save it as a PDF.",
    selectButtonLabel: "",
    convertButtonLabel: "Save website as PDF",
    idleHelperText: "Enter a public website URL to start.",
    processingHelperText: "The page needs time to load before it can be exported as a PDF.",
    resultLabel: "Website PDF is ready.",
    urlPlaceholder: "https://example.com",
    steps: [
      { title: "Enter the website URL", description: "Paste the public webpage address you want to save." },
      { title: "Load the page", description: "The tool opens the page in a browser environment and waits for it to render." },
      { title: "Export and download", description: "Create the PDF and download it when the export is ready." },
    ],
  },
};
