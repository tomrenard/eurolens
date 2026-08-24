-- Ingest layer.
--
-- EuroLens previously fetched everything from the European Parliament Open
-- Data API at request time and reshaped it in memory. That put a hard ceiling
-- on the product: an arbitrary 30-procedure catalogue, no real search, and one
-- endpoint returning ~3MB per call that could not be cached.
--
-- These tables are the local mirror a scheduled job fills. Reads become a
-- single indexed query; the EP API is only touched by the job.
--
-- Everything here is public information, so anon may read. Nothing grants
-- insert or update: the ingest job authenticates with the service role, which
-- bypasses RLS, so there is no write path from the browser at all.

-- Procedures ---------------------------------------------------------------

create table if not exists public.procedures (
  reference text primary key,
  process_id text,

  -- Language-keyed maps exactly as the EP publishes them, so the app can serve
  -- any of the Parliament's own translations without a translation service.
  titles jsonb not null default '{}'::jsonb,
  summaries jsonb not null default '{}'::jsonb,

  type text not null default 'Procedure',
  status text not null default 'In Progress',
  committees text[] not null default '{}',
  source_url text,

  last_activity_date timestamptz,
  last_activity_type text,

  -- Populated for files that have reached a plenary vote.
  is_completed boolean not null default false,
  votes_favor integer,
  votes_against integer,
  votes_abstention integer,
  voted_at timestamptz,

  first_seen_at timestamptz not null default now(),
  ingested_at timestamptz not null default now()
);

create index if not exists procedures_status_idx
  on public.procedures (is_completed, last_activity_date desc nulls last);

create index if not exists procedures_voted_at_idx
  on public.procedures (voted_at desc nulls last)
  where is_completed;

create index if not exists procedures_committees_idx
  on public.procedures using gin (committees);

-- Trigram index over the English title, so search can move server-side instead
-- of filtering whatever handful of rows the client happens to hold.
create extension if not exists pg_trgm;

create index if not exists procedures_title_trgm_idx
  on public.procedures using gin ((titles ->> 'en') gin_trgm_ops);

-- Plenary sessions ---------------------------------------------------------

create table if not exists public.plenary_sessions (
  id text primary key,
  title text not null default '',
  start_date timestamptz not null,
  end_date timestamptz not null,
  ingested_at timestamptz not null default now()
);

create index if not exists plenary_sessions_start_idx
  on public.plenary_sessions (start_date);

-- Ingest bookkeeping -------------------------------------------------------
--
-- Without this a silently failing cron looks identical to a quiet week.

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean not null default false,
  procedures_upserted integer not null default 0,
  sessions_upserted integer not null default 0,
  error text
);

create index if not exists ingest_runs_started_idx
  on public.ingest_runs (started_at desc);

-- RLS ----------------------------------------------------------------------

alter table public.procedures enable row level security;
alter table public.plenary_sessions enable row level security;
alter table public.ingest_runs enable row level security;

drop policy if exists "Procedures are public" on public.procedures;
create policy "Procedures are public"
  on public.procedures for select
  using (true);

drop policy if exists "Plenary sessions are public" on public.plenary_sessions;
create policy "Plenary sessions are public"
  on public.plenary_sessions for select
  using (true);

-- Ingest history is operational data, not public content: no select policy, so
-- only the service role can read it.
