-- Tracks which mirrored procedures have had their detail record fetched.
--
-- The listing endpoint returns thousands of procedures cheaply, but each one
-- needs a separate detail request for its title translations, summary and
-- committees. That cannot all happen in one serverless invocation, so the job
-- enriches a bounded batch per run and uses this column to know where it got
-- to. NULL means "listed but not yet enriched".

alter table public.procedures
  add column if not exists enriched_at timestamptz;

create index if not exists procedures_enriched_at_idx
  on public.procedures (enriched_at nulls first);
