-- Hardening pass over the initial schema, plus removal of the ranking system.
--
-- 1. The leaderboard policy exposed every column of every profile to the anon
--    key. Postgres ORs policies together, so the narrower "read own profile"
--    policy granted nothing extra. The public ranking is gone entirely, so the
--    policy is simply dropped rather than replaced.
-- 2. XP, levels, streaks and achievements are removed. A civic record is now a
--    private tally derived from the user's own positions.
-- 3. Positions gain updated_at so editing a position no longer has to destroy
--    created_at to record that something changed.
-- 4. Usernames are user-set and rendered back into the page, so they get a
--    length and character constraint.

-- 1. Profiles: no more public read ----------------------------------------

drop policy if exists "Anyone can read profiles for leaderboard" on public.profiles;

-- "Users can read own profile" from the initial migration remains the only
-- SELECT policy on the base table, so a profile is visible to its owner alone.

-- 2. Positions ------------------------------------------------------------

alter table public.positions
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists positions_updated_at on public.positions;
create trigger positions_updated_at
  before update on public.positions
  for each row execute function public.set_updated_at();

-- 3. Username constraints -------------------------------------------------
--
-- Normalise before constraining. Adding a CHECK to a table that already holds
-- a violating row aborts the whole migration and silently takes the RLS fix
-- above down with it, so every row that cannot satisfy the constraint is reset
-- first — including names using scripts outside the allowed range.

update public.profiles
set username = 'EU Citizen'
where username is null
   or btrim(username) = ''
   or char_length(btrim(username)) > 40
   or btrim(username) !~ '^[[:alnum:] \-''_À-ɏ]+$';

update public.profiles
set username = btrim(username)
where username <> btrim(username);

alter table public.profiles
  drop constraint if exists profiles_username_length;

alter table public.profiles
  add constraint profiles_username_length
  check (char_length(username) between 1 and 40);

alter table public.profiles
  drop constraint if exists profiles_username_charset;

-- Letters, digits, spaces, hyphens, underscores, apostrophes, and Latin-1 /
-- Latin Extended-A accented characters.
alter table public.profiles
  add constraint profiles_username_charset
  check (username ~ '^[[:alnum:] \-''_À-ɏ]+$');

-- 4. Drop the ranking columns ---------------------------------------------
--
-- DESTRUCTIVE: this discards stored XP, levels, streaks and achievements.
-- They were client-declared and therefore never trustworthy, which is part of
-- why the ranking is being removed. Comment this block out if you would rather
-- keep the columns around.

alter table public.profiles drop column if exists xp;
alter table public.profiles drop column if exists level;
alter table public.profiles drop column if exists streak;
alter table public.profiles drop column if exists last_active_date;
alter table public.profiles drop column if exists achievements;

-- 5. Stats blob -----------------------------------------------------------
--
-- summariesGenerated is gone with the language model that produced them, and
-- proceduresViewed was never actually incremented by anything.

alter table public.profiles
  alter column stats set default '{
    "totalPositions": 0,
    "mepsContacted": 0,
    "consultationsJoined": 0,
    "petitionsSigned": 0,
    "proceduresShared": 0
  }'::jsonb;

update public.profiles
set stats = stats - 'summariesGenerated' - 'proceduresViewed'
where stats ?| array['summariesGenerated', 'proceduresViewed'];
