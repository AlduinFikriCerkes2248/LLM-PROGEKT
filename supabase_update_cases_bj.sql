-- ==========================================
-- ОНОВЛЕННЯ БЛЕКДЖЕКУ ТА СИСТЕМИ КЕЙСІВ
-- ==========================================

-- 1. bj_start з лімітом до 1 000 000 монет
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

  -- Перемішуємо 52 карти
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

-- 2. Функція відкриття кейсів
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
    box_title := 'Хохловська заначка';
    coins_reward := 500 + floor(random() * 200)::int; -- 500-700 монет
    xp_reward := 60;
  elsif p_box_type = 'marchenko' then
    box_title := 'Світ Марченка';
    coins_reward := 20000 + floor(random() * 5000)::int; -- 20000-25000 монет
    xp_reward := 400;
  elsif p_box_type = 'admin' then
    box_title := 'Адміновська долина';
    coins_reward := 1000000; -- Рівно 1 000 000 монет
    xp_reward := 5000;
  else
    raise exception 'invalid_box_type';
  end if;

  -- Нараховуємо монети в профіль
  update public.profiles set coins = coins + coins_reward where id = uid;

  return jsonb_build_object(
    'success', true,
    'box', box_title,
    'coins', coins_reward,
    'xp', xp_reward
  );
end;
$$;

-- Права доступу
grant execute on function public.bj_start(integer) to authenticated;
grant execute on function public.open_loot_box(text) to authenticated;
