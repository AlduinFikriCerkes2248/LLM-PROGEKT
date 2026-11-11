-- Міграція 1: Створення схеми даних під інтерфейс застосунку Matchday (ПР 4)

-- 1. Таблиця profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null check (length(trim(username)) > 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ТИМЧАСОВО, замінюється в ПР 5
create policy pr4_temp_all on public.profiles
  for all to anon, authenticated
  using (true)
  with check (true);

grant all on public.profiles to anon, authenticated;


-- 2. Таблиця leagues
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  invite_code text not null unique check (length(trim(invite_code)) >= 6),
  owner_id uuid not null references public.profiles(id) on delete cascade
);

alter table public.leagues enable row level security;

-- ТИМЧАСОВО, замінюється в ПР 5
create policy pr4_temp_all on public.leagues
  for all to anon, authenticated
  using (true)
  with check (true);

grant all on public.leagues to anon, authenticated;


-- 3. Таблиця зв'язку league_members (M:N)
create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  unique (league_id, user_id)
);

alter table public.league_members enable row level security;

-- ТИМЧАСОВО, замінюється в ПР 5
create policy pr4_temp_all on public.league_members
  for all to anon, authenticated
  using (true)
  with check (true);

grant all on public.league_members to anon, authenticated;


-- 4. Таблиця matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  team_home text not null check (length(trim(team_home)) > 0),
  team_away text not null check (length(trim(team_away)) > 0),
  match_time timestamptz not null,
  status text not null default 'planned' check (status in ('planned', 'live', 'finished', 'cancelled')),
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0)
);

alter table public.matches enable row level security;

-- ТИМЧАСОВО, замінюється в ПР 5
create policy pr4_temp_all on public.matches
  for all to anon, authenticated
  using (true)
  with check (true);

grant all on public.matches to anon, authenticated;


-- 5. Таблиця predictions
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score integer not null check (predicted_home_score >= 0),
  predicted_away_score integer not null check (predicted_away_score >= 0),
  points_earned integer check (points_earned >= 0),
  unique (user_id, match_id)
);

alter table public.predictions enable row level security;

-- ТИМЧАСОВО, замінюється в ПР 5
create policy pr4_temp_all on public.predictions
  for all to anon, authenticated
  using (true)
  with check (true);

grant all on public.predictions to anon, authenticated;
