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
- JSZip

## Installation

```bash
npm install
```

## Requirements

- Node.js 18.18 or newer
- A Supabase project if you want auth and logged-in usage tracking

## Run Locally

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase values.
3. Create the `conversion_usage` table and policies in Supabase.
4. Start the development server.

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

If these values are missing, the app still works in guest mode and auth buttons stay connected to a safe fallback message.

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

Create the table:

```sql
create table conversion_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  conversions_used int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);
```

Enable RLS:

```sql
alter table conversion_usage enable row level security;
```

Add policies:

```sql
create policy "Users can read their own usage"
on conversion_usage
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own usage"
on conversion_usage
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own usage"
on conversion_usage
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Create persistent guest usage table:

```sql
create table guest_conversion_usage (
  id uuid primary key default gen_random_uuid(),
  guest_key text not null,
  date date not null,
  conversions_used int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(guest_key, date)
);
```

Create logged-in conversion history table:

```sql
create table conversion_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes int not null,
  output_format text not null,
  storage_path text not null,
  converted_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
```

Enable RLS and history policies:

```sql
alter table conversion_history enable row level security;

create policy "Users can read their own conversion history"
on conversion_history
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own conversion history"
on conversion_history
for insert
to authenticated
with check (auth.uid() = user_id);
```

Create a private Supabase Storage bucket named `converted-images`. Add storage policies that allow authenticated users to upload and read objects inside their own user-id folder.

## Folder Structure

```text
app/
  api/convert/route.ts
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
  auth.ts
  constants.ts
  conversion-history.ts
  file.ts
  format.ts
  supabase.ts
  usage.ts
  zip.ts
types/
  auth.ts
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
- Supabase Storage
- User dashboard
- Paid plans

## Known Limitations

- Guest usage has a browser counter plus an in-memory server guard. For multi-instance production deployments, move guest usage and rate limits to shared storage such as Redis or a database.
- Conversion history uses browser session blobs, so downloads are available while the current app session is open.
