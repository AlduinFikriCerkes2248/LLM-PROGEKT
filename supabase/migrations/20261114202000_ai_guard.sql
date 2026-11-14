-- Міграція ai_guard: таблиці лімітів і кешу моделі (Практична робота 6)

-- 1. Таблиця ai_calls: облік викликів і витрат моделі
create table if not exists public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cached boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ai_calls enable row level security;

-- 2. Таблиця ai_cache: кешування відповідей моделі
create table if not exists public.ai_cache (
  key text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_cache enable row level security;

-- 3. Політики ai_calls: лише свої записи
revoke update, delete on public.ai_calls from authenticated;

drop policy if exists "ai_calls_insert_own" on public.ai_calls;
create policy "ai_calls_insert_own" on public.ai_calls
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ai_calls_select_own" on public.ai_calls;
create policy "ai_calls_select_own" on public.ai_calls
for select to authenticated using (user_id = auth.uid());

-- 4. Політики ai_cache: лише свої записи
revoke delete on public.ai_cache from authenticated;

drop policy if exists "ai_cache_select_own" on public.ai_cache;
create policy "ai_cache_select_own" on public.ai_cache
for select to authenticated using (user_id = auth.uid());

drop policy if exists "ai_cache_insert_own" on public.ai_cache;
create policy "ai_cache_insert_own" on public.ai_cache
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ai_cache_update_own" on public.ai_cache;
create policy "ai_cache_update_own" on public.ai_cache
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5. Загальний бюджет застосунку: скільки платних викликів зробили всі користувачі за сьогодні (UTC)
create or replace function public.ai_app_calls_today() returns integer
language sql stable security definer set search_path = '' as $fn$
select count(*)::integer from public.ai_calls
where cached = false and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
$fn$;

revoke execute on function public.ai_app_calls_today() from anon;
revoke execute on function public.ai_app_calls_today() from public;
grant execute on function public.ai_app_calls_today() to authenticated;
