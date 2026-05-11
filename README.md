# Convertly Image

Convertly Image is a minimal image converter web app that lets users upload AVIF, BMP, GIF, ICO, PNG, JPG, JPEG, JFIF, TIFF, and WEBP files, convert them into another format, and download the result. It supports multiple image conversion, dark mode, guest usage limits, and higher limits for logged-in users.

## Features

- Single image conversion
- Multiple image conversion
- Individual file downloads
- Download all converted files as ZIP
- Server-side request limits, batch limits, and usage checks
- Soft green light mode and calm dark mode
- Guest usage tracking with a daily limit
- Supabase email and password authentication
- Higher daily limits for logged-in users
- Responsive landing page and converter experience

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS 4
- Next.js App Router and API routes
- Sharp
- Supabase Auth
- Supabase Database
- Supabase Storage
- JSZip

## Installation

```bash
npm install
```

## Requirements

- Node.js 18.18 or newer
- A Supabase project if you want auth, logged-in usage tracking, persistent platform jobs, and stored outputs

## Run Locally

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase values.
3. Run `supabase/setup.sql` in the Supabase SQL Editor.
4. Start the development server.

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CONVERSION_PROCESSING_MODE=inline
CONVERSION_WORKER_SECRET=
CONVERSION_API_KEYS_REQUIRED=false
```

If these values are missing, the app still works in guest mode and auth buttons stay connected to a safe fallback message.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is used by the v1 platform API to persist job metadata and upload converted outputs to private storage. Never expose it in browser code or commit real values.

`CONVERSION_PROCESSING_MODE` can be `inline` or `queued`. Use `inline` for local development and `queued` when a worker is calling `POST /api/v1/workers/process`. Set `CONVERSION_WORKER_SECRET` in production and send it as either `Authorization: Bearer <secret>` or `X-Worker-Secret: <secret>`.

`CONVERSION_API_KEYS_REQUIRED` controls whether v1 platform endpoints require `Authorization: Bearer cvt_live_...`. It defaults to required in production and optional outside production. Set it explicitly for deployments.

## Auth Setup

- In Supabase, go to `Authentication` -> `Providers`
- Enable the `Email` provider
- Use email and password auth for sign up and log in

## Supported Formats

### Input

- PNG
- AVIF
- BMP
- GIF
- ICO
- JPG
- JPEG
- JFIF
- TIFF
- WEBP

### Output

- AVIF
- BMP
- GIF
- ICO
- PNG
- JPG
- TIFF
- WEBP

## Usage Rules

- Guests get 15 successful conversions per day.
- Logged-in free users get 75 successful conversions per day.
- Batch conversions count per successfully converted image.
- Guest usage is tracked with `localStorage` in the browser and an in-memory IP-based server guard.
- Logged-in usage is tracked in Supabase using the `conversion_usage` table and checked by the API route.
- Guest users can upload up to 10 images at once, 20MB per image.
- Logged-in free users can upload up to 30 images at once, 75MB per image.
- Guest conversions run 2 at a time with a 1-minute processing timeout per image.
- Logged-in free conversions run 5 at a time with a 3-minute processing timeout per image.
- Guest downloads expire after 1 hour and do not appear in history.
- Logged-in free users can access their last 20 conversions for 24 hours.

## Supabase Setup

The full setup script lives in `supabase/setup.sql`. It creates:

- `conversion_usage`
- `guest_conversion_usage`
- `conversion_history`
- `conversion_api_keys`
- `conversion_platform_jobs`
- `conversion_platform_files`
- `conversion_usage_events`
- private `converted-images` bucket
- private `conversion-platform-files` bucket

The existing web app uses the usage and history tables. The v1 platform API uses `conversion_api_keys`, `conversion_platform_jobs`, `conversion_platform_files`, `conversion_usage_events`, and `conversion-platform-files` when `SUPABASE_SERVICE_ROLE_KEY` is configured.

## Folder Structure

```text
app/
  api/convert/route.ts
  api/v1/api-keys/route.ts
  api/v1/jobs/route.ts
  api/v1/jobs/[jobId]/route.ts
  api/v1/jobs/[jobId]/download/route.ts
  api/v1/operations/route.ts
  api/v1/workers/process/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  AuthModal.tsx
  BatchResultList.tsx
  ConverterCard.tsx
  CTASection.tsx
  FileList.tsx
  Footer.tsx
  FormatSelector.tsx
  HowItWorks.tsx
  Navbar.tsx
  SectionHeading.tsx
  SupportedFormats.tsx
  ThemeProvider.tsx
  ThemeToggle.tsx
  UploadBox.tsx
  UsageBadge.tsx
lib/
  api-keys.ts
  auth.ts
  constants.ts
  conversion-engines.ts
  conversion-history.ts
  conversion-jobs.ts
  file.ts
  format.ts
  supabase.ts
  supabase-server.ts
  usage.ts
  zip.ts
types/
  auth.ts
  conversion-platform.ts
  converter.ts
  usage.ts
```

## Conversion Flow

1. Upload one or more supported image files.
2. Choose one output format for the full batch.
3. The frontend validates files and usage limits for immediate feedback.
4. The API route validates files, rate limits requests, checks server-side usage, and converts images with `sharp`.
5. The API returns a binary image for single conversions or a ZIP for batch conversions.
6. The frontend creates download links from the returned blobs.
7. Usage is only incremented after successful conversions.

## Conversion Platform API

The app also includes a first version of a job-oriented conversion API. This is the foundation for a CloudConvert-style platform where requests create jobs, jobs are processed by conversion engines, and outputs are downloaded separately.

Current v1 endpoints:

```text
GET  /api/v1/operations
POST /api/v1/api-keys
POST /api/v1/jobs
GET  /api/v1/jobs/:jobId
GET  /api/v1/jobs/:jobId/download
POST /api/v1/workers/process
```

Create an API key with a logged-in Supabase access token:

```text
POST /api/v1/api-keys
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

```json
{
  "name": "Production key"
}
```

The response includes the raw `cvt_live_...` key once. Store it securely.

Create a conversion job with multipart form data:

```text
Authorization: Bearer cvt_live_xxxxx
job=<JSON payload>
files=<one or more uploaded files>
```

Example `job` payload:

```json
{
  "tasks": {
    "convert-main": {
      "operation": "convert",
      "output_format": "webp",
      "engine": "sharp",
      "options": {
        "quality": 90,
        "keepMetadata": false,
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

The platform API supports two processing modes:

```text
inline: POST /api/v1/jobs stores the job, processes it immediately, and returns a finished or failed job.
queued: POST /api/v1/jobs stores the job and input files, returns a queued job, and waits for a worker.
```

In queued mode, call `POST /api/v1/workers/process` from a scheduler, background process, or hosted worker. The worker claims the oldest queued job, downloads stored inputs, runs the configured engine, stores outputs, and updates the job status.

With `SUPABASE_SERVICE_ROLE_KEY` configured, job metadata and task payloads are persisted in Supabase, input and output files are stored in the private `conversion-platform-files` bucket, completed jobs write usage events, and downloads continue to work across server restarts. Without Supabase admin credentials, jobs fall back to in-memory storage for local development.

Planned engine expansion:

```text
Images: sharp, ImageMagick
Video/audio: ffmpeg
Documents: LibreOffice headless
PDF: poppler, qpdf, Ghostscript
Archives: 7zip
Web capture: Playwright/Chromium
```

## Testing Checklist

- Upload PNG and convert to JPG
- Upload JPG and convert to WEBP
- Upload WEBP and convert to PNG
- Upload AVIF and convert to TIFF
- Upload GIF and convert to AVIF
- Upload multiple images and convert all
- Download one converted image
- Download all as ZIP
- Try unsupported file type
- Try file above 10MB
- Try clicking convert with no file
- Test guest limit
- Test login
- Test logged-in limit
- Try converting more than the current plan's batch limit
- Try a file above the current plan's per-image size limit
- Test logged-in conversion history
- Test logout
- Test dark mode
- Test mobile layout
- Test desktop layout
- Test error messages

## Future Improvements

- Crop images
- PDF conversion
- User dashboard
- Paid plans
- API keys
- Webhooks

## Known Limitations

- The v1 worker processes one queued job per request. For higher throughput, run multiple scheduled worker calls or move execution to a dedicated worker service.
- Guest usage has a browser counter plus an in-memory server guard. For multi-instance production deployments, move guest usage and rate limits to shared storage such as Redis or a database.
- Conversion history uses browser session blobs, so downloads are available while the current app session is open.
