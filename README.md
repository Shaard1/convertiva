# Convertiva

**Major Update:** Convertiva is now a hardened, job-oriented file conversion platform built with Next.js. It includes dedicated tools for images, video, audio, documents, archives, PDFs, website capture, and spreadsheets, backed by a consistent public API, persistent jobs, bounded processing, and worker-ready media conversion.

## Major update highlights

- One source of truth for converter capabilities, engines, formats, and upload policies
- Consistent `/api/v1` success and error envelopes with request IDs and safe public errors
- Idempotent job creation for reliable retries without duplicate conversions
- Atomic per-key request limits and daily conversion quotas through Supabase
- Persistent input/output storage with bounded in-memory fallback for local development
- Atomic worker claims, expiring leases, authenticated worker routes, and queue recovery
- Liveness and readiness probes for deployment monitoring
- Expanded contract, rate-limit, quota, capacity, and URL-safety tests

## Current platform

Ready in-process tools:

- Image Converter
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

Worker-backed tools (require the Go media worker and `ffmpeg`):

- Video Converter
- Audio Converter

Interface ready, conversion engine pending:

- Document Converter (`LibreOffice` worker required)

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
- `GET /api/v1/health`
- `GET /api/v1/ready`
- `POST /api/v1/api-keys`
- `POST /api/v1/jobs`
- `GET /api/v1/jobs/:jobId`
- `GET /api/v1/jobs/:jobId/download`
- `POST /api/v1/workers/process`
- `POST /api/v1/workers/claim`
- `GET /api/v1/workers/jobs/:jobId/inputs/:fileId`
- `POST /api/v1/workers/jobs/:jobId/outputs`
- `POST /api/v1/workers/jobs/:jobId/fail`
- `POST /api/v1/workers/cleanup`
- `GET /api/v1/workers/cleanup` (Vercel Cron only)

### Platform API contract

Successful JSON responses use a stable envelope:

```json
{
  "data": {},
  "error": null,
  "meta": {
    "requestId": "request-id",
    "version": "v1"
  }
}
```

Errors retain the original string `error` field for existing clients and add a stable machine-readable `code`. Every response includes `X-Request-ID` and `Server-Timing`; clients may supply a valid `X-Request-ID` to correlate their own logs.

Send an `Idempotency-Key` header with `POST /api/v1/jobs` when a request may be retried. Reusing the same key and payload returns the original job and sets `Idempotency-Replayed: true`; reusing a key with a different payload returns `409`.

Authenticated job endpoints return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`. Rate-limit responses also include `Retry-After`.

The worker-authenticated `POST` cleanup endpoint supports manual runs and external schedulers. Vercel Cron uses the separately authenticated `GET` endpoint and removes expired job rows and their private storage objects in bounded batches.

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

After updating an existing installation, run `supabase/setup.sql` again. The
script is idempotent and installs the atomic quota functions, private guest
usage policies, and leased job-claim functions required by the hardened API.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GUEST_USAGE_HASH_SECRET=
CONVERSION_PROCESSING_MODE=inline
CONVERSION_WORKER_SECRET=
CRON_SECRET=
CONVERSION_API_KEYS_REQUIRED=true
CONVERSION_API_RATE_LIMIT_PER_MINUTE=60
CONVERSION_API_DAILY_LIMIT=1000
SEVEN_ZIP_PATH=
IMAGE_CONVERSION_CONCURRENCY=4
BROWSER_RENDER_CONCURRENCY=2
TOOL_REQUEST_CONCURRENCY=4
```

Notes:

- The app still works in guest mode if Supabase values are missing
- `SUPABASE_SERVICE_ROLE_KEY` is server-only
- `GUEST_USAGE_HASH_SECRET` pseudonymizes guest network identifiers; use a long random server-only value
- `CONVERSION_PROCESSING_MODE` can be `inline` or `queued`
- `CONVERSION_WORKER_SECRET` is required when using the worker route in production
- `CRON_SECRET` authenticates Vercel Cron independently from media workers; use a long random production-only value
- `CONVERSION_API_KEYS_REQUIRED` controls whether the v1 API requires bearer API keys
- Keep `CONVERSION_API_KEYS_REQUIRED=true` outside isolated local development
- `CONVERSION_API_RATE_LIMIT_PER_MINUTE` is the default request limit assigned to newly created API keys
- `CONVERSION_API_DAILY_LIMIT` is the default daily conversion allowance assigned to newly created API keys
- `SEVEN_ZIP_PATH` overrides the archive converter executable path
- `IMAGE_CONVERSION_CONCURRENCY` and `BROWSER_RENDER_CONCURRENCY` bound CPU-heavy work per application instance
- `TOOL_REQUEST_CONCURRENCY` caps concurrent legacy tool requests per application instance to protect memory and CPU

## Scheduled cleanup on Vercel

The root `vercel.json` schedules `GET /api/v1/workers/cleanup` once per day at
03:00 UTC. The daily schedule works on all Vercel plans. On Pro or Enterprise,
change the schedule to `*/15 * * * *` if you want cleanup every 15 minutes.

Before deploying, add a long random `CRON_SECRET` in Vercel under **Project
Settings > Environment Variables** for the Production environment, then
redeploy. Vercel automatically sends that secret as a bearer token to the
scheduled `GET` request.

The manual `POST /api/v1/workers/cleanup` endpoint remains available and uses
`CONVERSION_WORKER_SECRET` instead:

```bash
curl -X POST https://convertiva.vercel.app/api/v1/workers/cleanup \
  -H "Authorization: Bearer $CONVERSION_WORKER_SECRET"
```

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

Operational probes:

- `GET /api/v1/health` confirms that the API process is alive.
- `GET /api/v1/ready` checks database and queued-worker configuration and returns `503` when the platform is not ready to accept jobs.

## Known limitations

- Some older converter components still contain duplicated auth and usage setup and can be refactored further
- Website tools depend on a local browser install
- Archive conversion depends on local 7-Zip
- OCR, CAD, and some presentation/ebook/vector/font conversions still need dedicated engines
- Guest usage protection is not yet designed for a distributed multi-instance deployment without shared backend state
- Durable v1 jobs, distributed API limits, and multi-instance worker claims require Supabase; the local fallback is intended for development

## Next improvements

- Refactor older converter components to share more shell logic
- Move large public API uploads to signed direct-to-storage transfers
- Add worker heartbeats, progress reporting, cancellation, and dead-letter handling
- Add real help, pricing, privacy, terms, and contact content
- Add engine-backed implementations for the remaining coming-soon tools
- Expand test coverage around the newer tool routes

