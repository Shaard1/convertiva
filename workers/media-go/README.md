# Convertiva Media Worker

This worker is the future home for media-heavy conversions that should not run
inside a Next.js request handler.

## Responsibilities

- Claim queued `video`, `audio`, and later `archive` jobs.
- Download validated inputs from the platform storage layer.
- Run native tools such as `ffmpeg` and `7-Zip`.
- Upload converted outputs back to platform storage.
- Mark jobs as `finished` or `failed` with useful error context.

## Required Environment

```env
CONVERSION_API_BASE_URL=http://localhost:3000
CONVERSION_WORKER_SECRET=
MEDIA_WORKER_POLL_SECONDS=5
MEDIA_WORKER_HTTP_TIMEOUT_SECONDS=300
MEDIA_WORKER_JOB_TIMEOUT_SECONDS=900
MEDIA_WORKER_MAX_TRANSFER_BYTES=536870912
MEDIA_WORKER_ENABLE_PROCESSING=false
```

The worker also requires `ffmpeg` to be available on `PATH`.

The worker stops gracefully on shutdown, limits response bodies and output
files, and terminates media processing after `MEDIA_WORKER_JOB_TIMEOUT_SECONDS`.
Keep the job timeout below the platform's worker lease duration.

## Planned Platform Contract

The Next.js app remains the public API. This worker should authenticate with
`CONVERSION_WORKER_SECRET` and use worker-only endpoints for job processing.

```text
POST /api/v1/workers/claim
GET  /api/v1/workers/jobs/:jobId/inputs/:fileId
POST /api/v1/workers/jobs/:jobId/outputs
POST /api/v1/workers/jobs/:jobId/fail
```

Processing is disabled by default. Set `MEDIA_WORKER_ENABLE_PROCESSING=true`
only when `ffmpeg` is installed and the Next.js app is running with the same
`CONVERSION_WORKER_SECRET`.

The public client should continue using:

```text
POST /api/v1/jobs
GET  /api/v1/jobs/:jobId
GET  /api/v1/jobs/:jobId/download
```
