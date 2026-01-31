-- EuroLens Supabase schema: profiles, positions, user_alerts
-- Run in Supabase SQL Editor or via supabase db push

-- Profiles: one per auth.users row
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'EU Citizen',
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  last_active_date date not null default current_date,
  stats jsonb not null default '{
    "totalPositions": 0,
    "mepsContacted": 0,
    "consultationsJoined": 0,
    "petitionsSigned": 0,
    "proceduresShared": 0,
    "proceduresViewed": 0,
    "summariesGenerated": 0
  }'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Positions: user positions on procedures
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  procedure_id text not null,
  procedure_title text not null,
  position text not null check (position in ('support', 'oppose', 'neutral')),
  reason text,
  actions_taken jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, procedure_id)
);

-- User alerts (e.g. procedure activity, plenary reminder)
create table if not exists public.user_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  procedure_reference text,
  topic text,
  type text not null,
  channel text not null check (channel in ('email', 'in_app')),
  created_at timestamptz not null default now()
);

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'EU Citizen'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.positions enable row level security;
alter table public.user_alerts enable row level security;

-- Profiles: users can read own; anyone can read for leaderboard (public read)
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Anyone can read profiles for leaderboard"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Positions: users can only access their own
create policy "Users can manage own positions"
  on public.positions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User alerts: users can only access their own
create policy "Users can manage own alerts"
  on public.user_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated_at trigger for profiles
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
