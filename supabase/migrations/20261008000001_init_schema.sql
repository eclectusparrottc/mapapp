-- CityGap Phase 1 — initial schema (ADR-004). Idempotent re-runs are not expected; each change gets a new migration.
-- Separation of concerns: venue / activity / occurrence / availability snapshot / source record / sync run.
-- Security model (ADR-002): anon + authenticated can only SELECT publicly displayable rows via RLS.
-- No INSERT/UPDATE/DELETE policies exist for them; writes happen only with service_role from the server-side importer.

create type public.activity_kind as enum ('scheduled_event', 'drop_in', 'bookable_slot');
create type public.end_time_quality as enum ('known', 'estimated', 'unknown');
create type public.cancellation_status as enum ('scheduled', 'cancelled', 'postponed');
create type public.booking_state as enum (
  'verified_available', 'sales_open_not_inventory', 'unknown', 'full', 'unavailable'
);
create type public.data_permission_status as enum ('authorized', 'synthetic', 'unverified', 'denied');
create type public.sync_status as enum ('running', 'succeeded', 'partial', 'failed');

create table public.venues (
  id               text primary key check (id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  name             text not null check (length(name) between 1 and 200),
  lat              double precision check (lat between -90 and 90),
  lng              double precision check (lng between -180 and 180),
  address          text,
  timezone         text not null,
  source_metadata  jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now(),
  check ((lat is null) = (lng is null))
);

create table public.activities (
  id                    text primary key check (id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  title                 text not null check (length(title) between 1 and 200),
  kind                  public.activity_kind not null,
  category              text[] not null default '{}',
  short_summary         text not null default '' check (length(short_summary) <= 280),
  duration_min_minutes  integer check (duration_min_minutes > 0),
  duration_max_minutes  integer check (duration_max_minutes > 0),
  venue_id              text not null references public.venues(id) on delete restrict,
  status                text not null default 'active' check (status in ('active', 'inactive')),
  source_url            text check (source_url ~ '^https?://'),
  requires_booking      boolean,
  updated_at            timestamptz not null default now(),
  check (duration_max_minutes is null or duration_min_minutes is null or duration_max_minutes >= duration_min_minutes)
);

create table public.occurrences (
  id                   text primary key check (id ~ '^[A-Za-z0-9._:-]{1,250}$'),
  activity_id          text not null references public.activities(id) on delete cascade,
  starts_at_utc        timestamptz,
  ends_at_utc          timestamptz,
  original_timezone    text not null,
  end_time_quality     public.end_time_quality not null default 'unknown',
  recurrence_info      text,
  cancellation_status  public.cancellation_status not null default 'scheduled',
  updated_at           timestamptz not null default now(),
  check (ends_at_utc is null or starts_at_utc is null or ends_at_utc > starts_at_utc),
  -- "end time unknown" must not masquerade as a known end.
  check (end_time_quality = 'unknown' or ends_at_utc is not null)
);
create index occurrences_starts_idx on public.occurrences (starts_at_utc);
create index occurrences_activity_idx on public.occurrences (activity_id);

-- Append-only history; the latest row per occurrence is the current state.
create table public.availability_snapshots (
  id                   bigint generated always as identity primary key,
  occurrence_id        text not null references public.occurrences(id) on delete cascade,
  booking_state        public.booking_state not null default 'unknown',
  verified_at          timestamptz,
  expires_at           timestamptz,
  verification_source  text,
  recorded_at          timestamptz not null default now(),
  -- "verified_available" without evidence and an expiry is not allowed.
  check (booking_state <> 'verified_available' or (verified_at is not null and expires_at is not null))
);
create index availability_latest_idx on public.availability_snapshots (occurrence_id, recorded_at desc, id desc);

create table public.source_records (
  source_name             text not null,
  external_id             text not null,
  occurrence_id           text not null references public.occurrences(id) on delete cascade,
  source_url              text check (source_url ~ '^https?://'),
  last_seen_at            timestamptz not null default now(),
  data_permission_status  public.data_permission_status not null default 'unverified',
  last_source_update      timestamptz,
  raw_hash                text not null,
  primary key (source_name, external_id)
);
create index source_records_occurrence_idx on public.source_records (occurrence_id);

create table public.sync_runs (
  id               uuid primary key default gen_random_uuid(),
  source_name      text not null,
  started_at       timestamptz not null,
  finished_at      timestamptz,
  status           public.sync_status not null,
  received_count   integer not null default 0 check (received_count >= 0),
  accepted_count   integer not null default 0 check (accepted_count >= 0),
  rejected_count   integer not null default 0 check (rejected_count >= 0),
  error_summary    jsonb not null default '{}'::jsonb,
  error_message    text
);
create index sync_runs_source_started_idx on public.sync_runs (source_name, started_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Publicly displayable = linked to at least one source record whose rights allow display.
-- SECURITY DEFINER so the policy can consult source_records without exposing it.
create or replace function public.is_public_occurrence(occ_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.source_records sr
    where sr.occurrence_id = occ_id
      and sr.data_permission_status in ('authorized', 'synthetic')
  );
$$;
revoke all on function public.is_public_occurrence(text) from public;

-- Display-safe provenance for one occurrence (best permission first). Never returns raw_hash.
create or replace function public.occurrence_public_source(occ_id text)
returns table (source_name text, data_permission_status public.data_permission_status, last_source_update timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select sr.source_name, sr.data_permission_status, sr.last_source_update
  from public.source_records sr
  where sr.occurrence_id = occ_id
    and sr.data_permission_status in ('authorized', 'synthetic')
  order by (sr.data_permission_status = 'authorized') desc, sr.last_source_update desc nulls last
  limit 1;
$$;
revoke all on function public.occurrence_public_source(text) from public;

alter table public.venues                 enable row level security;
alter table public.activities             enable row level security;
alter table public.occurrences            enable row level security;
alter table public.availability_snapshots enable row level security;
alter table public.source_records         enable row level security;
alter table public.sync_runs              enable row level security;

alter table public.venues                 force row level security;
alter table public.activities             force row level security;
alter table public.occurrences            force row level security;
alter table public.availability_snapshots force row level security;
alter table public.source_records         force row level security;
alter table public.sync_runs              force row level security;

-- Start from zero privileges for client roles, then grant SELECT only where needed.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant execute on function public.is_public_occurrence(text) to anon, authenticated;
grant execute on function public.occurrence_public_source(text) to anon, authenticated;
grant select on public.venues, public.activities, public.occurrences, public.availability_snapshots
  to anon, authenticated;
-- source_records and sync_runs: no grants, no policies => invisible to clients.

create policy occurrences_public_read on public.occurrences
  for select to anon, authenticated
  using (public.is_public_occurrence(id));

create policy activities_public_read on public.activities
  for select to anon, authenticated
  using (status = 'active' and exists (
    select 1 from public.occurrences o where o.activity_id = activities.id and public.is_public_occurrence(o.id)
  ));

create policy venues_public_read on public.venues
  for select to anon, authenticated
  using (exists (
    select 1 from public.activities a where a.venue_id = venues.id
  ));

create policy availability_public_read on public.availability_snapshots
  for select to anon, authenticated
  using (public.is_public_occurrence(occurrence_id));

-- ---------------------------------------------------------------------------
-- Read model for the public API (security_invoker => RLS of the caller applies).
-- Exposes only display-safe columns; never raw_hash or internal sync data.
-- ---------------------------------------------------------------------------
create view public.public_occurrences_v1
with (security_invoker = true) as
select
  o.id                     as occurrence_id,
  a.id                     as activity_id,
  a.title,
  a.kind,
  a.category               as categories,
  a.short_summary,
  a.duration_min_minutes,
  a.duration_max_minutes,
  a.requires_booking,
  a.source_url,
  v.id                     as venue_id,
  v.name                   as venue_name,
  v.lat,
  v.lng,
  v.address,
  v.timezone               as venue_timezone,
  o.starts_at_utc,
  o.ends_at_utc,
  o.original_timezone,
  o.end_time_quality,
  o.cancellation_status,
  coalesce(s.booking_state, 'unknown'::public.booking_state) as booking_state,
  s.verified_at,
  s.expires_at,
  s.verification_source,
  src.source_name,
  src.data_permission_status,
  src.last_source_update
from public.occurrences o
join public.activities a on a.id = o.activity_id
join public.venues v on v.id = a.venue_id
left join lateral (
  select s.booking_state, s.verified_at, s.expires_at, s.verification_source
  from public.availability_snapshots s
  where s.occurrence_id = o.id
  order by s.recorded_at desc, s.id desc
  limit 1
) s on true
left join lateral public.occurrence_public_source(o.id) src on true;

grant select on public.public_occurrences_v1 to anon, authenticated;
