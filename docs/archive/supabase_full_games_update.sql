-- ====================================================================
-- MATCHDAY · ПОВНЕ ОНОВЛЕННЯ БАЗИ ДАНИХ (ІГРИ, КЕЙСИ, БОНУСИ, ОНЛАЙН)
-- Виконайте цей SQL у Supabase SQL Editor
-- ====================================================================

-- 1. Додавання другої валюти "hohlyantsi" (Бонуси) до таблиці profiles
alter table public.profiles 
add column if not exists hohlyantsi integer not null default 25 check (hohlyantsi >= 0);

-- 2. Оновлення bj_start (ставка до 1 000 000 монет + правильна ініціалізація deck)
create or replace function public.bj_start(p_bet integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u_coins integer;
  g_id uuid;
  shuffled integer[];
  p_cards integer[];
  d_cards integer[];
  remaining_deck integer[];
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_bet is null or p_bet < 1 or p_bet > 1000000 then
    raise exception 'invalid_bet';
  end if;

  if exists (select 1 from public.blackjack_games where user_id = uid and status = 'active') then
    raise exception 'game_in_progress';
  end if;

  select coins into u_coins from public.profiles where id = uid;
  if u_coins is null or u_coins < p_bet then
    raise exception 'insufficient_funds';
  end if;

  -- Списуємо ставку
  update public.profiles set coins = coins - p_bet where id = uid;

  -- Перемішуємо колоду 52 карти
  select array_agg(c order by random()) into shuffled from generate_series(0, 51) c;

  p_cards := array[shuffled[1], shuffled[3]];
  d_cards := array[shuffled[2], shuffled[4]];
  remaining_deck := shuffled[5:52];

  insert into public.blackjack_games (user_id, bet, status, player_cards, dealer_cards, deck)
  values (uid, p_bet, 'active', p_cards, d_cards, remaining_deck)
  returning id into g_id;

  return public.bj_state();
end;
$$;

-- 3. Функція для гри в Кості (play_dice)
create or replace function public.play_dice(p_bet integer, p_pick text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u_coins integer;
  d1 integer;
  d2 integer;
  d_sum integer;
  is_won boolean := false;
  win_multiplier numeric := 0;
  payout_amount integer := 0;
  new_balance integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_bet is null or p_bet < 1 or p_bet > 500000 then
    raise exception 'invalid_bet';
  end if;

  select coins into u_coins from public.profiles where id = uid;
  if u_coins is null or u_coins < p_bet then
    raise exception 'insufficient_funds';
  end if;

  -- Списуємо ставку
  update public.profiles set coins = coins - p_bet where id = uid;

  -- Кидаємо два кубики (1-6)
  d1 := floor(random() * 6 + 1)::int;
  d2 := floor(random() * 6 + 1)::int;
  d_sum := d1 + d2;

  -- Розрахунок результату
  if p_pick = 'under7' and d_sum < 7 then
    is_won := true;
    win_multiplier := 2.0;
  elsif p_pick = 'seven' and d_sum = 7 then
    is_won := true;
    win_multiplier := 5.8;
  elsif p_pick = 'over7' and d_sum > 7 then
    is_won := true;
    win_multiplier := 2.0;
  elsif p_pick = 'doubles' and d1 = d2 then
    is_won := true;
    win_multiplier := 6.0;
  end if;

  if is_won then
    payout_amount := floor(p_bet * win_multiplier)::int;
    update public.profiles set coins = coins + payout_amount where id = uid;
  end if;

  select coins into new_balance from public.profiles where id = uid;

  return jsonb_build_object(
    'won', is_won,
    'dice1', d1,
    'dice2', d2,
    'sum', d_sum,
    'payout', payout_amount,
    'balance', new_balance
  );
end;
$$;

-- 4. Функція безкоштовного відкриття щоденного кейсу
create or replace function public.open_loot_box(p_box_type text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  coins_reward integer := 0;
  xp_reward integer := 0;
  box_title text := '';
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_box_type = 'khokhlov' then
    box_title := 'Кейс 1';
    coins_reward := 500 + floor(random() * 300)::int;
    xp_reward := 60;
  elsif p_box_type = 'marchenko' then
    box_title := 'Кейс 2';
    coins_reward := 20000 + floor(random() * 5000)::int;
    xp_reward := 400;
  elsif p_box_type = 'admin' then
    box_title := 'Кейс 3';
    coins_reward := 1000000;
    xp_reward := 5000;
  else
    raise exception 'invalid_box_type';
  end if;

  update public.profiles set coins = coins + coins_reward where id = uid;

  return jsonb_build_object(
    'success', true,
    'box', box_title,
    'coins', coins_reward,
    'xp', xp_reward
  );
end;
$$;

-- 5. Функція купівлі кейсів за Бонуси (друга сіра валюта)
create or replace function public.buy_case_with_hohlyantsi(p_box_type text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u_hohlyantsi integer;
  cost integer := 0;
  coins_reward integer := 0;
  xp_reward integer := 0;
  box_title text := '';
  new_hohlyantsi integer;
  new_coins integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_box_type = 'khokhlov' then
    cost := 5;
    box_title := 'Кейс 1';
    coins_reward := 500 + floor(random() * 300)::int;
    xp_reward := 60;
  elsif p_box_type = 'marchenko' then
    cost := 25;
    box_title := 'Кейс 2';
    coins_reward := 20000 + floor(random() * 5000)::int;
    xp_reward := 400;
  elsif p_box_type = 'admin' then
    cost := 100;
    box_title := 'Кейс 3';
    coins_reward := 1000000;
    xp_reward := 5000;
  else
    raise exception 'invalid_box_type';
  end if;

  select hohlyantsi into u_hohlyantsi from public.profiles where id = uid;
  if u_hohlyantsi is null or u_hohlyantsi < cost then
    raise exception 'insufficient_hohlyantsi';
  end if;

  -- Списуємо бонуси і додаємо монети
  update public.profiles 
  set hohlyantsi = hohlyantsi - cost,
      coins = coins + coins_reward 
  where id = uid;

  select coins, hohlyantsi into new_coins, new_hohlyantsi from public.profiles where id = uid;

  return jsonb_build_object(
    'success', true,
    'box', box_title,
    'coins_reward', coins_reward,
    'xp_reward', xp_reward,
    'cost', cost,
    'coins', new_coins,
    'hohlyantsi', new_hohlyantsi
  );
end;
$$;

-- 6. Таблиця для Онлайн Дуелей (PVP)
create table if not exists public.pvp_duels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  game_type text not null check (game_type in ('blackjack', 'dice')),
  stake integer not null check (stake > 0),
  currency text not null check (currency in ('coins', 'hohlyantsi')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  winner_id uuid references public.profiles(id) on delete set null,
  challenger_score integer,
  opponent_score integer,
  challenger_roll integer[],
  opponent_roll integer[]
);

-- Оновлюємо check constraint на статус, щоб дозволити 'completed'
alter table public.pvp_duels drop constraint if exists pvp_duels_status_check;
alter table public.pvp_duels add constraint pvp_duels_status_check 
check (status in ('pending', 'accepted', 'declined', 'completed', 'cancelled'));

-- Додавання колонок якщо таблиця вже існувала раніше
alter table public.pvp_duels add column if not exists challenger_roll integer[];
alter table public.pvp_duels add column if not exists opponent_roll integer[];
alter table public.pvp_duels add column if not exists challenger_score integer;
alter table public.pvp_duels add column if not exists opponent_score integer;
alter table public.pvp_duels add column if not exists winner_id uuid references public.profiles(id);

alter table public.pvp_duels enable row level security;
drop policy if exists "Authenticated users can view duels" on public.pvp_duels;
create policy "Authenticated users can view duels"
on public.pvp_duels for all
to authenticated
using (true)
with check (true);

-- 7. Функція: Надіслати виклик на гру (send_duel_invite)
create or replace function public.send_duel_invite(
  p_opponent uuid,
  p_game text,
  p_stake integer,
  p_currency text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u_val integer;
  d_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if uid = p_opponent then
    raise exception 'cannot_duel_self';
  end if;

  if p_stake is null or p_stake < 1 then
    raise exception 'invalid_stake';
  end if;

  if p_currency not in ('coins', 'hohlyantsi') then
    raise exception 'invalid_currency';
  end if;

  if p_game not in ('blackjack', 'dice') then
    raise exception 'invalid_game';
  end if;

  -- Перевірка балансу ініціатора
  if p_currency = 'coins' then
    select coins into u_val from public.profiles where id = uid;
    if u_val is null or u_val < p_stake then
      raise exception 'insufficient_coins';
    end if;
    update public.profiles set coins = coins - p_stake where id = uid;
  else
    select hohlyantsi into u_val from public.profiles where id = uid;
    if u_val is null or u_val < p_stake then
      raise exception 'insufficient_hohlyantsi';
    end if;
    update public.profiles set hohlyantsi = hohlyantsi - p_stake where id = uid;
  end if;

  insert into public.pvp_duels (challenger_id, opponent_id, game_type, stake, currency, status)
  values (uid, p_opponent, p_game, p_stake, p_currency, 'pending')
  returning id into d_id;

  return jsonb_build_object(
    'success', true,
    'duel_id', d_id
  );
end;
$$;

-- 8. Функція: Відповісти на виклик (respond_duel_invite: accept або decline)
create or replace function public.respond_duel_invite(
  p_duel_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  d record;
  opp_val integer;
  ch_score integer;
  opp_score integer;
  ch_dice integer[];
  opp_dice integer[];
  d_winner uuid;
  pot integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into d from public.pvp_duels where id = p_duel_id;
  if not found then
    raise exception 'duel_not_found';
  end if;

  if d.status != 'pending' then
    raise exception 'duel_not_pending';
  end if;

  -- Відхилення виклику або скасування автором
  if p_action = 'decline' or p_action = 'cancel' then
    if uid != d.opponent_id and uid != d.challenger_id then
      raise exception 'unauthorized';
    end if;

    -- Повертаємо ставку ініціатору
    if d.currency = 'coins' then
      update public.profiles set coins = coins + d.stake where id = d.challenger_id;
    else
      update public.profiles set hohlyantsi = hohlyantsi + d.stake where id = d.challenger_id;
    end if;

    update public.pvp_duels set status = 'declined' where id = p_duel_id;

    return jsonb_build_object('success', true, 'status', 'declined');
  end if;

  -- Прийняття виклику (тільки опонент)
  if p_action = 'accept' then
    if uid != d.opponent_id then
      raise exception 'only_opponent_can_accept';
    end if;

    -- Перевірка балансу опонента
    if d.currency = 'coins' then
      select coins into opp_val from public.profiles where id = uid;
      if opp_val is null or opp_val < d.stake then
        raise exception 'insufficient_coins';
      end if;
      update public.profiles set coins = coins - d.stake where id = uid;
    else
      select hohlyantsi into opp_val from public.profiles where id = uid;
      if opp_val is null or opp_val < d.stake then
        raise exception 'insufficient_hohlyantsi';
      end if;
      update public.profiles set hohlyantsi = hohlyantsi - d.stake where id = uid;
    end if;

    pot := d.stake * 2;

    -- Логіка гри
    if d.game_type = 'dice' then
      -- Кидок по 2 кубики кожному
      ch_dice := array[floor(random() * 6 + 1)::int, floor(random() * 6 + 1)::int];
      opp_dice := array[floor(random() * 6 + 1)::int, floor(random() * 6 + 1)::int];
      ch_score := ch_dice[1] + ch_dice[2];
      opp_score := opp_dice[1] + opp_dice[2];
    else
      -- Блекджек дуель: очки від 17 до 21 (випадкова роздача рук)
      ch_score := 16 + floor(random() * 6)::int;
      opp_score := 16 + floor(random() * 6)::int;
      ch_dice := array[ch_score];
      opp_dice := array[opp_score];
    end if;

    -- Визначаємо переможця
    if ch_score > opp_score then
      d_winner := d.challenger_id;
      if d.currency = 'coins' then
        update public.profiles set coins = coins + pot where id = d_winner;
      else
        update public.profiles set hohlyantsi = hohlyantsi + pot where id = d_winner;
      end if;
    elsif opp_score > ch_score then
      d_winner := d.opponent_id;
      if d.currency = 'coins' then
        update public.profiles set coins = coins + pot where id = d_winner;
      else
        update public.profiles set hohlyantsi = hohlyantsi + pot where id = d_winner;
      end if;
    else
      -- Нічия: повертаємо ставки обом
      d_winner := null;
      if d.currency = 'coins' then
        update public.profiles set coins = coins + d.stake where id = d.challenger_id;
        update public.profiles set coins = coins + d.stake where id = d.opponent_id;
      else
        update public.profiles set hohlyantsi = hohlyantsi + d.stake where id = d.challenger_id;
        update public.profiles set hohlyantsi = hohlyantsi + d.stake where id = d.opponent_id;
      end if;
    end if;

    update public.pvp_duels
    set status = 'completed',
        winner_id = d_winner,
        challenger_score = ch_score,
        opponent_score = opp_score,
        challenger_roll = ch_dice,
        opponent_roll = opp_dice
    where id = p_duel_id;

    return jsonb_build_object(
      'success', true,
      'status', 'completed',
      'challenger_score', ch_score,
      'opponent_score', opp_score,
      'challenger_roll', ch_dice,
      'opponent_roll', opp_dice,
      'winner_id', d_winner,
      'pot', pot
    );
  end if;

  raise exception 'invalid_action';
end;
$$;

-- 9. Функція загального рейтингу (Leaderboard) для казино та костей
create or replace function public.get_casino_leaderboard()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  res jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'username', coalesce(p.username, 'Агент ' || substring(p.id::text, 1, 4)),
      'coins', coalesce(p.coins, 0),
      'hohlyantsi', coalesce(p.hohlyantsi, 25)
    )
  )
  into res
  from (
    select id, username, coins, hohlyantsi
    from public.profiles
    where coins is not null
    order by coins desc
    limit 10
  ) p;

  return coalesce(res, '[]'::jsonb);
end;
$$;

-- 10. Дозволи виконання функцій для авторизованих користувачів
grant execute on function public.bj_start(integer) to authenticated;
grant execute on function public.play_dice(integer, text) to authenticated;
grant execute on function public.open_loot_box(text) to authenticated;
grant execute on function public.buy_case_with_hohlyantsi(text) to authenticated;
grant execute on function public.send_duel_invite(uuid, text, integer, text) to authenticated;
grant execute on function public.respond_duel_invite(uuid, text) to authenticated;
grant execute on function public.get_casino_leaderboard() to authenticated;
