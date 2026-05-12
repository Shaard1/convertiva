# Convertiva

Convertiva is a file conversion platform built with Next.js. It includes dedicated tools for images, video, audio, documents, archives, PDFs, website capture, and spreadsheet conversion, with a soft green UI, responsive layouts, light and dark mode, guest usage limits, and higher limits for signed-in users.

## Current platform

Ready tools:

- Image Converter
- Video Converter
- Audio Converter
- Document Converter
- Spreadsheet Converter
- Archive Converter
- Compress PDF
- Compress PNG
- Compress JPG
- Merge PDF
- Create Archive
- Extract Archive
- Website to PDF
- Website Screenshot

Coming soon tools:

- Presentation Converter
- Ebook Converter
- Font Converter
- Vector Converter
- CAD Converter
- PDF OCR

## Core features

- Dedicated converter pages instead of one overloaded form
- Converter mega menu with grouped tools
- Guest and signed-in usage limits
- Soft green light theme and calm dark theme
- Responsive homepage, footer, and tool layouts
- Top route loading indicator for page changes
- Placeholder tool pages for features that still need external engines
- First version of a job-oriented platform API under `/api/v1`

## Tech stack

- Next.js 15
- TypeScript
- Tailwind CSS 4
- React 19
- Supabase Auth
- Sharp
- JSZip
- PDF-Lib
- Playwright Core
- XLSX

## Working conversion routes

Main converters:

- `/tools/image-converter`
- `/tools/video-converter`
- `/tools/audio-converter`
- `/tools/document-converter`
- `/tools/spreadsheet-converter`
- `/tools/archive-converter`

Utility tools:

- `/tools/compress-pdf`
- `/tools/compress-png`
- `/tools/compress-jpg`
- `/tools/merge-pdf`
- `/tools/create-archive`
- `/tools/extract-archive`
- `/tools/website-to-pdf`
- `/tools/website-screenshot`

Platform pages:

- `/pricing`
- `/help`
- `/privacy-policy`
- `/terms`
- `/contact`

## API routes

Existing converters:

- `POST /api/convert`
- `POST /api/convert-audio`
- `POST /api/convert-video`
- `POST /api/convert-document`

Working tool APIs:

- `POST /api/archive-converter`
- `POST /api/compress-pdf`
- `POST /api/compress-png`
- `POST /api/compress-jpg`
- `POST /api/create-archive`
- `POST /api/extract-archive`
- `POST /api/merge-pdf`
- `POST /api/spreadsheet-converter`
- `POST /api/website-to-pdf`
- `POST /api/website-screenshot`

Platform API:

- `GET /api/v1/operations`
- `POST /api/v1/api-keys`
- `POST /api/v1/jobs`
- `GET /api/v1/jobs/:jobId`
- `GET /api/v1/jobs/:jobId/download`
- `POST /api/v1/workers/process`

## Requirements

- Node.js 18.18 or newer
- A Supabase project if you want authentication, persistent usage tracking, history, and the v1 platform storage flow

Optional local tooling for specific routes:

- Microsoft Edge or Chrome installed locally for website screenshot and website-to-pdf
- 7-Zip installed locally for archive conversion

Not currently installed in this project environment:

- LibreOffice
- Tesseract OCR

Those missing engines are the reason some tools still remain marked `Soon`.

## Installation

```bash
npm install
```

## Run locally

1. Copy `.env.example` to `.env.local`
2. Add your Supabase values
3. Run `supabase/setup.sql` in the Supabase SQL editor if you want full auth and usage support
4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CONVERSION_PROCESSING_MODE=inline
CONVERSION_WORKER_SECRET=
CONVERSION_API_KEYS_REQUIRED=false
```

Notes:

- The app still works in guest mode if Supabase values are missing
- `SUPABASE_SERVICE_ROLE_KEY` is server-only
- `CONVERSION_PROCESSING_MODE` can be `inline` or `queued`
- `CONVERSION_WORKER_SECRET` is required when using the worker route in production
- `CONVERSION_API_KEYS_REQUIRED` controls whether the v1 API requires bearer API keys

## Usage rules

- Guests get 15 successful conversions per day
- Signed-in users get 75 successful conversions per day
- Guest usage is stored in the browser and protected server-side by request checks
- Signed-in usage is tracked through Supabase

## Notes on implemented tools

Archive Converter:

- Supports converting supported archives to `ZIP`, `7Z`, or `TAR`
- Uses local `7z.exe`

Spreadsheet Converter:

- Supports `XLSX`, `XLS`, `CSV`, `TSV`, and `ODS`

Website Screenshot:

- Captures public webpages as images
- Blocks obvious local/private targets

Website to PDF:

- Saves public webpages as PDF
- Uses the local browser runtime through Playwright

Compress PDF:

- Rewrites PDFs using PDF-Lib and only returns the optimized file when it is actually smaller

Extract Archive:

- Current working flow is ZIP-focused

## Project structure

```text
app/
  api/
  auth/
  contact/
  help/
  pricing/
  privacy-policy/
  reset-password/
  terms/
  tools/
  globals.css
  layout.tsx
  page.tsx
components/
  AudioConverter.tsx
  ConvertersMegaMenu.tsx
  Footer.tsx
  InfoPage.tsx
  Navbar.tsx
  PlatformDashboard.tsx
  RouteLoadingIndicator.tsx
  ToolPlaceholderPage.tsx
  WorkingToolPage.tsx
hooks/
  useAppShellState.ts
lib/
  tools/
  formats/
  auth.ts
  usage.ts
types/
tests/
```

## Validation

Current project checks:

```bash
npm run lint
npm run build
npm test
```

## Known limitations

- Some older converter components still contain duplicated auth and usage setup and can be refactored further
- Website tools depend on a local browser install
- Archive conversion depends on local 7-Zip
- OCR, CAD, and some presentation/ebook/vector/font conversions still need dedicated engines
- Guest usage protection is not yet designed for a distributed multi-instance deployment without shared backend state

## Next improvements

- Refactor older converter components to share more shell logic
- Add real help, pricing, privacy, terms, and contact content
- Add engine-backed implementations for the remaining coming-soon tools
- Expand test coverage around the newer tool routes

