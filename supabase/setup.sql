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

drop policy if exists "Users can update their own usage"
on public.conversion_usage;

create table if not exists public.guest_conversion_usage (
  id uuid primary key default gen_random_uuid(),
  guest_key text not null,
  date date not null,
  conversions_used int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(guest_key, date)
);

-- Guest usage is private server-side data. The application accesses it only
-- through the service-role client and stores a keyed hash instead of a raw IP.
alter table public.guest_conversion_usage enable row level security;

drop policy if exists "Anon can read guest usage"
on public.guest_conversion_usage;

drop policy if exists "Anon can insert guest usage"
on public.guest_conversion_usage;

drop policy if exists "Anon can update guest usage"
on public.guest_conversion_usage;

create or replace function public.reserve_guest_conversion_usage(
  p_guest_key text,
  p_day date,
  p_amount int,
  p_limit int
)
returns table(allowed boolean, conversions_used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
begin
  if p_amount < 1 or p_limit < 1 or p_amount > p_limit then
    raise exception 'Invalid quota reservation';
  end if;

  insert into public.guest_conversion_usage (
    guest_key,
    date,
    conversions_used,
    updated_at
  )
  values (p_guest_key, p_day, p_amount, now())
  on conflict (guest_key, date) do update
  set
    conversions_used = public.guest_conversion_usage.conversions_used + excluded.conversions_used,
    updated_at = now()
  where public.guest_conversion_usage.conversions_used + excluded.conversions_used <= p_limit
  returning public.guest_conversion_usage.conversions_used into v_used;

  if found then
    return query select true, v_used;
    return;
  end if;

  select usage.conversions_used
  into v_used
  from public.guest_conversion_usage as usage
  where usage.guest_key = p_guest_key and usage.date = p_day;

  return query select false, coalesce(v_used, 0);
end;
$$;

create or replace function public.reserve_authenticated_conversion_usage(
  p_user_id uuid,
  p_day date,
  p_amount int,
  p_limit int
)
returns table(allowed boolean, conversions_used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
begin
  if p_amount < 1 or p_limit < 1 or p_amount > p_limit then
    raise exception 'Invalid quota reservation';
  end if;

  insert into public.conversion_usage (
    user_id,
    date,
    conversions_used,
    updated_at
  )
  values (p_user_id, p_day, p_amount, now())
  on conflict (user_id, date) do update
  set
    conversions_used = public.conversion_usage.conversions_used + excluded.conversions_used,
    updated_at = now()
  where public.conversion_usage.conversions_used + excluded.conversions_used <= p_limit
  returning public.conversion_usage.conversions_used into v_used;

  if found then
    return query select true, v_used;
    return;
  end if;

  select usage.conversions_used
  into v_used
  from public.conversion_usage as usage
  where usage.user_id = p_user_id and usage.date = p_day;

  return query select false, coalesce(v_used, 0);
end;
$$;

create or replace function public.release_guest_conversion_usage(
  p_guest_key text,
  p_day date,
  p_amount int
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.guest_conversion_usage
  set conversions_used = greatest(conversions_used - greatest(p_amount, 0), 0),
      updated_at = now()
  where guest_key = p_guest_key and date = p_day;
$$;

create or replace function public.release_authenticated_conversion_usage(
  p_user_id uuid,
  p_day date,
  p_amount int
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversion_usage
  set conversions_used = greatest(conversions_used - greatest(p_amount, 0), 0),
      updated_at = now()
  where user_id = p_user_id and date = p_day;
$$;

revoke all on function public.reserve_guest_conversion_usage(text, date, int, int) from public, anon, authenticated;
revoke all on function public.reserve_authenticated_conversion_usage(uuid, date, int, int) from public, anon, authenticated;
revoke all on function public.release_guest_conversion_usage(text, date, int) from public, anon, authenticated;
revoke all on function public.release_authenticated_conversion_usage(uuid, date, int) from public, anon, authenticated;
grant execute on function public.reserve_guest_conversion_usage(text, date, int, int) to service_role;
grant execute on function public.reserve_authenticated_conversion_usage(uuid, date, int, int) to service_role;
grant execute on function public.release_guest_conversion_usage(text, date, int) to service_role;
grant execute on function public.release_authenticated_conversion_usage(uuid, date, int) to service_role;

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
  user_id uuid references auth.users(id) on delete set null,
  api_key_id uuid,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.conversion_platform_jobs
add column if not exists task_payload jsonb not null default '{}'::jsonb;

alter table public.conversion_platform_jobs
add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.conversion_platform_jobs
add column if not exists api_key_id uuid;

alter table public.conversion_platform_jobs
add column if not exists claimed_at timestamptz;

alter table public.conversion_platform_jobs
add column if not exists worker_lease_expires_at timestamptz;

alter table public.conversion_platform_jobs
add column if not exists attempt_count int not null default 0;

alter table public.conversion_platform_jobs enable row level security;

create table if not exists public.conversion_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  is_active boolean not null default true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversion_api_keys enable row level security;

alter table public.conversion_platform_jobs
drop constraint if exists conversion_platform_jobs_api_key_id_fkey;

alter table public.conversion_platform_jobs
add constraint conversion_platform_jobs_api_key_id_fkey
foreign key (api_key_id)
references public.conversion_api_keys(id)
on delete set null;

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

create index if not exists conversion_platform_jobs_api_key_idx
on public.conversion_platform_jobs (api_key_id, created_at desc);

create index if not exists conversion_platform_jobs_worker_queue_idx
on public.conversion_platform_jobs (created_at)
where status in ('queued', 'processing');

create index if not exists conversion_api_keys_user_idx
on public.conversion_api_keys (user_id, created_at desc);

create table if not exists public.conversion_usage_events (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.conversion_api_keys(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  job_id text references public.conversion_platform_jobs(id) on delete set null,
  event_type text not null,
  conversion_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.conversion_usage_events enable row level security;

create index if not exists conversion_usage_events_api_key_idx
on public.conversion_usage_events (api_key_id, created_at desc);

-- The v1 platform API writes these tables with SUPABASE_SERVICE_ROLE_KEY.
-- Client reads should go through API routes, not direct table policies.

insert into storage.buckets (id, name, public)
values ('conversion-platform-files', 'conversion-platform-files', false)
on conflict (id) do update
set public = excluded.public;

create or replace function public.claim_next_worker_conversion_job(
  p_requested_tools text[] default array[]::text[]
)
returns table(job_id text)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversion_platform_jobs
  set
    status = 'failed',
    error = 'Worker lease expired after the maximum number of attempts.',
    updated_at = now(),
    worker_lease_expires_at = null
  where status = 'processing'
    and worker_lease_expires_at < now()
    and attempt_count >= 3;

  return query
  with candidate as (
    select jobs.id
    from public.conversion_platform_jobs as jobs
    where (
      jobs.status = 'queued'
      or (
        jobs.status = 'processing'
        and jobs.worker_lease_expires_at < now()
      )
    )
      and jobs.expires_at > now()
      and jobs.attempt_count < 3
      and jobs.task_payload->>'engine' in ('ffmpeg', 'libreoffice', 'sevenzip')
      and (
        cardinality(coalesce(p_requested_tools, array[]::text[])) = 0
        or coalesce(jobs.task_payload->>'tool', 'image') = any(p_requested_tools)
      )
    order by jobs.created_at asc
    for update skip locked
    limit 1
  )
  update public.conversion_platform_jobs as jobs
  set
    status = 'processing',
    claimed_at = now(),
    worker_lease_expires_at = now() + interval '20 minutes',
    attempt_count = jobs.attempt_count + 1,
    updated_at = now(),
    error = null
  from candidate
  where jobs.id = candidate.id
  returning jobs.id;
end;
$$;

revoke all on function public.claim_next_worker_conversion_job(text[]) from public;
revoke all on function public.claim_next_worker_conversion_job(text[]) from anon;
revoke all on function public.claim_next_worker_conversion_job(text[]) from authenticated;
grant execute on function public.claim_next_worker_conversion_job(text[]) to service_role;

create or replace function public.claim_next_inline_conversion_job()
returns table(job_id text)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversion_platform_jobs
  set
    status = 'failed',
    error = 'Inline processing lease expired after the maximum number of attempts.',
    updated_at = now(),
    worker_lease_expires_at = null
  where status = 'processing'
    and worker_lease_expires_at < now()
    and attempt_count >= 3
    and task_payload->>'engine' = 'sharp';

  return query
  with candidate as (
    select jobs.id
    from public.conversion_platform_jobs as jobs
    where (
      jobs.status = 'queued'
      or (
        jobs.status = 'processing'
        and jobs.worker_lease_expires_at < now()
      )
    )
      and jobs.expires_at > now()
      and jobs.attempt_count < 3
      and jobs.task_payload->>'engine' = 'sharp'
    order by jobs.created_at asc
    for update skip locked
    limit 1
  )
  update public.conversion_platform_jobs as jobs
  set
    status = 'processing',
    claimed_at = now(),
    worker_lease_expires_at = now() + interval '5 minutes',
    attempt_count = jobs.attempt_count + 1,
    updated_at = now(),
    error = null
  from candidate
  where jobs.id = candidate.id
  returning jobs.id;
end;
$$;

revoke all on function public.claim_next_inline_conversion_job() from public;
revoke all on function public.claim_next_inline_conversion_job() from anon;
revoke all on function public.claim_next_inline_conversion_job() from authenticated;
grant execute on function public.claim_next_inline_conversion_job() to service_role;
