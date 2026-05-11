-- Run this in the Supabase SQL Editor for the project used by .env.local.
-- It creates the remaining database and Storage objects expected by the app.

create table if not exists public.conversion_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  conversions_used int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.conversion_usage enable row level security;

drop policy if exists "Users can read their own usage"
on public.conversion_usage;

create policy "Users can read their own usage"
on public.conversion_usage
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own usage"
on public.conversion_usage;

create policy "Users can insert their own usage"
on public.conversion_usage
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own usage"
on public.conversion_usage;

create policy "Users can update their own usage"
on public.conversion_usage
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.guest_conversion_usage (
  id uuid primary key default gen_random_uuid(),
  guest_key text not null,
  date date not null,
  conversions_used int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(guest_key, date)
);

-- The app currently reads and upserts guest usage with the public anon key.
-- These policies expose only daily guest usage counters, not converted files.
alter table public.guest_conversion_usage enable row level security;

drop policy if exists "Anon can read guest usage"
on public.guest_conversion_usage;

create policy "Anon can read guest usage"
on public.guest_conversion_usage
for select
to anon
using (true);

drop policy if exists "Anon can insert guest usage"
on public.guest_conversion_usage;

create policy "Anon can insert guest usage"
on public.guest_conversion_usage
for insert
to anon
with check (true);

drop policy if exists "Anon can update guest usage"
on public.guest_conversion_usage;

create policy "Anon can update guest usage"
on public.guest_conversion_usage
for update
to anon
using (true)
with check (true);

create table if not exists public.conversion_history (
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

alter table public.conversion_history enable row level security;

drop policy if exists "Users can read their own conversion history"
on public.conversion_history;

create policy "Users can read their own conversion history"
on public.conversion_history
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own conversion history"
on public.conversion_history;

create policy "Users can insert their own conversion history"
on public.conversion_history
for insert
to authenticated
with check (auth.uid() = user_id);

create index if not exists conversion_history_user_expires_idx
on public.conversion_history (user_id, expires_at desc, converted_at desc);

insert into storage.buckets (id, name, public)
values ('converted-images', 'converted-images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can upload their own converted images"
on storage.objects;

create policy "Users can upload their own converted images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'converted-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own converted images"
on storage.objects;

create policy "Users can update their own converted images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'converted-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'converted-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can read their own converted images"
on storage.objects;

create policy "Users can read their own converted images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'converted-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create table if not exists public.conversion_platform_jobs (
  id text primary key,
  status text not null check (status in ('queued', 'processing', 'finished', 'failed')),
  task_payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.conversion_platform_jobs
add column if not exists task_payload jsonb not null default '{}'::jsonb;

alter table public.conversion_platform_jobs enable row level security;

create table if not exists public.conversion_platform_files (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.conversion_platform_jobs(id) on delete cascade,
  role text not null check (role in ('input', 'output')),
  file_name text not null,
  mime_type text not null,
  size_bytes int not null,
  storage_path text,
  created_at timestamptz not null default now()
);

alter table public.conversion_platform_files enable row level security;

create index if not exists conversion_platform_files_job_idx
on public.conversion_platform_files (job_id, role);

create index if not exists conversion_platform_jobs_expires_idx
on public.conversion_platform_jobs (expires_at);

-- The v1 platform API writes these tables with SUPABASE_SERVICE_ROLE_KEY.
-- Client reads should go through API routes, not direct table policies.

insert into storage.buckets (id, name, public)
values ('conversion-platform-files', 'conversion-platform-files', false)
on conflict (id) do update
set public = excluded.public;
