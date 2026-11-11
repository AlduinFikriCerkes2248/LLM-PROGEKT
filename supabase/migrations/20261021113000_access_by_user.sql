-- Міграція: Політики доступу за користувачем і роллю (ПР 5)

-- 1. Тригер автоматичного створення запису в profiles після реєстрації в auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Допоміжні функції перевірки прав (security definer для уникнення рекурсії)
create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_league_owner(p_league_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.leagues
    where id = p_league_id and owner_id = auth.uid()
  );
$$;


-- 3. Видалення тимчасових дозвільних політик ПР 4
drop policy if exists pr4_temp_all on public.profiles;
drop policy if exists pr4_temp_all on public.leagues;
drop policy if exists pr4_temp_all on public.league_members;
drop policy if exists pr4_temp_all on public.matches;
drop policy if exists pr4_temp_all on public.predictions;


-- 4. Відкликання публічних прав у анонімної ролі anon
revoke all on public.profiles from anon;
revoke all on public.leagues from anon;
revoke all on public.league_members from anon;
revoke all on public.matches from anon;
revoke all on public.predictions from anon;


-- 5. Політики доступу для ролі authenticated

-- Таблиця profiles: читання всім учасникам, редагування лише власного профілю
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- Таблиця leagues: читає творець або учасник; створює, змінює та видаляє лише творець (owner)
create policy leagues_select on public.leagues
  for select to authenticated
  using (owner_id = auth.uid() or public.is_league_member(id));

create policy leagues_insert on public.leagues
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy leagues_update on public.leagues
  for update to authenticated
  using (owner_id = auth.uid());

create policy leagues_delete on public.leagues
  for delete to authenticated
  using (owner_id = auth.uid());

-- Таблиця league_members: читають учасники та творець; додавати може користувач сам або творець
create policy members_select on public.league_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_league_owner(league_id));

create policy members_insert on public.league_members
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_league_owner(league_id));

create policy members_delete on public.league_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_league_owner(league_id));

-- Таблиця matches: читають члени ліги; створює, оновлює та видаляє лише творець ліги
create policy matches_select on public.matches
  for select to authenticated
  using (public.is_league_member(league_id) or public.is_league_owner(league_id));

create policy matches_insert on public.matches
  for insert to authenticated
  with check (public.is_league_owner(league_id));

create policy matches_update on public.matches
  for update to authenticated
  using (public.is_league_owner(league_id));

create policy matches_delete on public.matches
  for delete to authenticated
  using (public.is_league_owner(league_id));

-- Таблиця predictions: читати можуть учасники ліги матчу; створювати й змінювати лише автор
create policy predictions_select on public.predictions
  for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.matches m
    where m.id = match_id and (public.is_league_member(m.league_id) or public.is_league_owner(m.league_id))
  ));

create policy predictions_insert on public.predictions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy predictions_update on public.predictions
  for update to authenticated
  using (user_id = auth.uid());
