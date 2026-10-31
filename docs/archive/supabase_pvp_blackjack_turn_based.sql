-- ====================================================================
-- MATCHDAY · ОНОВЛЕННЯ ДЛЯ ПОКРОКОВОГО ОНЛАЙН БЛЕКДЖЕКУ (PVP TURN-BASED)
-- ====================================================================

-- 1. Оновлюємо таблицю pvp_duels для підтримки покрокової гри
alter table public.pvp_duels add column if not exists deck integer[];
alter table public.pvp_duels add column if not exists challenger_cards integer[];
alter table public.pvp_duels add column if not exists opponent_cards integer[];
alter table public.pvp_duels add column if not exists current_turn uuid references public.profiles(id);
alter table public.pvp_duels add column if not exists challenger_finished boolean default false;
alter table public.pvp_duels add column if not exists opponent_finished boolean default false;

-- 2. Оновлюємо check constraint на статус
alter table public.pvp_duels drop constraint if exists pvp_duels_status_check;
alter table public.pvp_duels add constraint pvp_duels_status_check 
check (status in ('pending', 'accepted', 'playing', 'declined', 'completed', 'cancelled'));

-- 3. Допоміжна функція підрахунку очок у Блекджеку в SQL
create or replace function public.calc_bj_score(p_cards integer[])
returns integer
language plpgsql
as $$
declare
  c integer;
  rank integer;
  score integer := 0;
  aces integer := 0;
begin
  if p_cards is null or array_length(p_cards, 1) is null then
    return 0;
  end if;

  foreach c in array p_cards loop
    rank := c % 13;
    if rank >= 8 and rank <= 11 then
      -- 10, J, Q, K
      score := score + 10;
    elsif rank = 12 then
      -- Туз
      aces := aces + 1;
      score := score + 11;
    else
      score := score + (rank + 2);
    end if;
  end loop;

  while score > 21 and aces > 0 loop
    score := score - 10;
    aces := aces - 1;
  end loop;

  return score;
end;
$$;

-- 4. Оновлення respond_duel_invite: для блекджеку роздає карти та ставить статус 'playing'
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
  ch_dice integer[];
  opp_dice integer[];
  d_winner uuid;
  pot integer;
  shuffled integer[];
  ch_hand integer[];
  opp_hand integer[];
  rem_deck integer[];
  ch_score integer;
  opp_score integer;
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

  -- ВІДХИЛИТИ / СКАСУВАТИ
  if p_action = 'decline' or p_action = 'cancel' then
    if uid != d.opponent_id and uid != d.challenger_id then
      raise exception 'unauthorized';
    end if;

    if d.currency = 'coins' then
      update public.profiles set coins = coins + d.stake where id = d.challenger_id;
    else
      update public.profiles set hohlyantsi = hohlyantsi + d.stake where id = d.challenger_id;
    end if;

    update public.pvp_duels set status = 'declined' where id = p_duel_id;
    return jsonb_build_object('success', true, 'status', 'declined');
  end if;

  -- ПРИЙНЯТИ
  if p_action = 'accept' then
    if uid != d.opponent_id then
      raise exception 'only_opponent_can_accept';
    end if;

    -- Списуємо ставку з опонента
    if d.currency = 'coins' then
      select coins into opp_val from public.profiles where id = uid;
      if opp_val is null or opp_val < d.stake then
        raise exception 'Недостатньо золотих монет для ставки!';
      end if;
      update public.profiles set coins = coins - d.stake where id = uid;
    else
      select hohlyantsi into opp_val from public.profiles where id = uid;
      if opp_val is null or opp_val < d.stake then
        raise exception 'Недостатньо Бонусів для ставки!';
      end if;
      update public.profiles set hohlyantsi = hohlyantsi - d.stake where id = uid;
    end if;

    pot := d.stake * 2;

    -- ДЛЯ КОСТЕЙ: миттєвий кидок
    if d.game_type = 'dice' then
      ch_dice := array[floor(random() * 6 + 1)::int, floor(random() * 6 + 1)::int];
      opp_dice := array[floor(random() * 6 + 1)::int, floor(random() * 6 + 1)::int];
      ch_score := ch_dice[1] + ch_dice[2];
      opp_score := opp_dice[1] + opp_dice[2];

      if ch_score > opp_score then
        d_winner := d.challenger_id;
      elsif opp_score > ch_score then
        d_winner := d.opponent_id;
      else
        d_winner := null;
      end if;

      if d_winner is not null then
        if d.currency = 'coins' then
          update public.profiles set coins = coins + pot where id = d_winner;
        else
          update public.profiles set hohlyantsi = hohlyantsi + pot where id = d_winner;
        end if;
      else
        -- Нічия
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

    -- ДЛЯ БЛЕКДЖЕКУ: ПОКРОКОВИЙ СТАРТ (роздаємо по 2 карти кожному)
    else
      select array_agg(c order by random()) into shuffled from generate_series(0, 51) c;

      ch_hand := array[shuffled[1], shuffled[3]];
      opp_hand := array[shuffled[2], shuffled[4]];
      rem_deck := shuffled[5:52];

      update public.pvp_duels
      set status = 'playing',
          deck = rem_deck,
          challenger_cards = ch_hand,
          opponent_cards = opp_hand,
          challenger_score = public.calc_bj_score(ch_hand),
          opponent_score = public.calc_bj_score(opp_hand),
          current_turn = d.challenger_id,
          challenger_finished = false,
          opponent_finished = false
      where id = p_duel_id;

      return jsonb_build_object(
        'success', true,
        'status', 'playing',
        'challenger_cards', ch_hand,
        'opponent_cards', opp_hand,
        'challenger_score', public.calc_bj_score(ch_hand),
        'opponent_score', public.calc_bj_score(opp_hand),
        'current_turn', d.challenger_id,
        'pot', pot
      );
    end if;
  end if;

  raise exception 'invalid_action';
end;
$$;

-- 5. Покроковий хід у Блекджеку (HIT або STAND)
create or replace function public.pvp_bj_action(
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
  card integer;
  rem_deck integer[];
  new_hand integer[];
  new_score integer;
  other_player uuid;
  is_ch boolean;
  ch_fin boolean;
  opp_fin boolean;
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

  if d.status != 'playing' then
    raise exception 'game_not_playing';
  end if;

  if d.current_turn != uid then
    raise exception 'not_your_turn';
  end if;

  is_ch := (uid = d.challenger_id);
  other_player := case when is_ch then d.opponent_id else d.challenger_id end;
  ch_fin := coalesce(d.challenger_finished, false);
  opp_fin := coalesce(d.opponent_finished, false);

  -- 1. ДІЯ: HIT (Взяти карту)
  if p_action = 'hit' then
    if array_length(d.deck, 1) < 1 then
      raise exception 'deck_empty';
    end if;

    card := d.deck[1];
    rem_deck := d.deck[2:array_length(d.deck, 1)];

    if is_ch then
      new_hand := array_append(d.challenger_cards, card);
      new_score := public.calc_bj_score(new_hand);
      d.challenger_cards := new_hand;
      d.challenger_score := new_score;

      if new_score >= 21 then
        ch_fin := true;
        d.current_turn := other_player;
      end if;
    else
      new_hand := array_append(d.opponent_cards, card);
      new_score := public.calc_bj_score(new_hand);
      d.opponent_cards := new_hand;
      d.opponent_score := new_score;

      if new_score >= 21 then
        opp_fin := true;
        d.current_turn := other_player;
      end if;
    end if;

    d.deck := rem_deck;

  -- 2. ДІЯ: STAND (Зупинитися)
  elsif p_action = 'stand' then
    if is_ch then
      ch_fin := true;
    else
      opp_fin := true;
    end if;
    d.current_turn := other_player;
  else
    raise exception 'invalid_action';
  end if;

  -- Перевірка чи обидва гравці завершили
  if ch_fin and opp_fin then
    pot := d.stake * 2;

    -- Визначення переможця
    if d.challenger_score > 21 and d.opponent_score <= 21 then
      d_winner := d.opponent_id;
    elsif d.opponent_score > 21 and d.challenger_score <= 21 then
      d_winner := d.challenger_id;
    elsif d.challenger_score > 21 and d.opponent_score > 21 then
      d_winner := null; -- Обидва перебрали (нічия)
    elsif d.challenger_score > d.opponent_score then
      d_winner := d.challenger_id;
    elsif d.opponent_score > d.challenger_score then
      d_winner := d.opponent_id;
    else
      d_winner := null; -- Рівні бали (нічия)
    end if;

    if d_winner is not null then
      if d.currency = 'coins' then
        update public.profiles set coins = coins + pot where id = d_winner;
      else
        update public.profiles set hohlyantsi = hohlyantsi + pot where id = d_winner;
      end if;
    else
      -- Нічия: повернення ставок
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
        challenger_finished = true,
        opponent_finished = true,
        deck = d.deck,
        challenger_cards = d.challenger_cards,
        opponent_cards = d.opponent_cards,
        challenger_score = d.challenger_score,
        opponent_score = d.opponent_score
    where id = p_duel_id;

    return jsonb_build_object(
      'status', 'completed',
      'challenger_cards', d.challenger_cards,
      'opponent_cards', d.opponent_cards,
      'challenger_score', d.challenger_score,
      'opponent_score', d.opponent_score,
      'winner_id', d_winner,
      'pot', pot
    );
  else
    -- Гра триває далі
    update public.pvp_duels
    set deck = d.deck,
        challenger_cards = d.challenger_cards,
        opponent_cards = d.opponent_cards,
        challenger_score = d.challenger_score,
        opponent_score = d.opponent_score,
        current_turn = d.current_turn,
        challenger_finished = ch_fin,
        opponent_finished = opp_fin
    where id = p_duel_id;

    return jsonb_build_object(
      'status', 'playing',
      'challenger_cards', d.challenger_cards,
      'opponent_cards', d.opponent_cards,
      'challenger_score', d.challenger_score,
      'opponent_score', d.opponent_score,
      'current_turn', d.current_turn,
      'challenger_finished', ch_fin,
      'opponent_finished', opp_fin
    );
  end if;
end;
$$;

-- 6. Права доступу
grant execute on function public.respond_duel_invite(uuid, text) to authenticated;
grant execute on function public.pvp_bj_action(uuid, text) to authenticated;
grant execute on function public.calc_bj_score(integer[]) to authenticated;
