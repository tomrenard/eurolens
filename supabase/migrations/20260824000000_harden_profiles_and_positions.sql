-- Hardening pass over the initial schema.
--
-- 1. The leaderboard policy exposed every column of every profile to the anon
--    key. Postgres ORs policies together, so the narrower "read own profile"
--    policy granted nothing extra. Replaced with a view that exposes only the
--    columns a leaderboard needs.
-- 2. Positions gain updated_at so editing a position no longer has to destroy
--    created_at to record that something changed.
-- 3. Usernames are user-set and publicly displayed, so they get a length and
--    character constraint.
-- 4. The stats blob loses summariesGenerated, which no longer exists now that
--    explanations are generated deterministically rather than by a model.

-- 1. Profiles -------------------------------------------------------------

drop policy if exists "Anyone can read profiles for leaderboard" on public.profiles;

-- "Users can read own profile" from the initial migration remains the only
-- SELECT policy on the base table.

create or replace view public.leaderboard_entries
with (security_invoker = off) as
  select
    id,
    username,
    xp,
    level,
    stats
  from public.profiles
  order by xp desc;

alter view public.leaderboard_entries owner to postgres;

grant select on public.leaderboard_entries to anon, authenticated;

-- 2. Positions ------------------------------------------------------------

alter table public.positions
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists positions_updated_at on public.positions;
create trigger positions_updated_at
  before update on public.positions
  for each row execute function public.set_updated_at();

-- 3. Username constraints -------------------------------------------------

update public.profiles
set username = 'EU Citizen'
where username is null
   or btrim(username) = ''
   or char_length(username) > 40;

alter table public.profiles
  drop constraint if exists profiles_username_length;

alter table public.profiles
  add constraint profiles_username_length
  check (char_length(username) between 1 and 40);

alter table public.profiles
  drop constraint if exists profiles_username_charset;

-- Letters, digits, spaces, hyphens, underscores and apostrophes only.
alter table public.profiles
  add constraint profiles_username_charset
  check (username ~ '^[\w \-''À-ɏ]+$');

-- 4. Stats blob -----------------------------------------------------------

alter table public.profiles
  alter column stats set default '{
    "totalPositions": 0,
    "mepsContacted": 0,
    "consultationsJoined": 0,
    "petitionsSigned": 0,
    "proceduresShared": 0,
    "proceduresViewed": 0
  }'::jsonb;

update public.profiles
set stats = stats - 'summariesGenerated'
where stats ? 'summariesGenerated';
