-- ====================================================================
-- MATCHDAY · ЧАСТИНА А: БЕЗПЕЧНІ ФУНКЦІЇ ТА ЛОГІКА (БЕЗ ЗМІНИ ПОЛІТИК)
-- Файл: supabase/migrations/20261028135000_pvp_security_a.sql
-- Тільки додавання: pvp_view, claim_duel_timeout, FOR UPDATE,
-- серверний кулдаун open_loot_box, колонка last_move_at.
-- ====================================================================

-- 1. Додавання необхідних колонок (якщо не існують)
ALTER TABLE public.pvp_duels ADD COLUMN IF NOT EXISTS last_move_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_box_at timestamptz;

-- 2. Допоміжна функція розрахунку очок у Блекджеку в SQL
CREATE OR REPLACE FUNCTION public.calc_bj_score(p_cards integer[])
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  c integer;
  rank integer;
  score integer := 0;
  aces integer := 0;
BEGIN
  IF p_cards IS NULL OR array_length(p_cards, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH c IN ARRAY p_cards LOOP
    rank := c % 13;
    IF rank >= 8 AND rank <= 11 THEN
      score := score + 10;
    ELSIF rank = 12 THEN
      aces := aces + 1;
      score := score + 11;
    ELSE
      score := score + (rank + 2);
    END IF;
  END LOOP;

  WHILE score > 21 AND aces > 0 LOOP
    score := score - 10;
    aces := aces - 1;
  END LOOP;

  RETURN score;
END;
$$;

-- 3. Функція pvp_view: безпечне читання стану дуелі з маскуванням закритих карт
CREATE OR REPLACE FUNCTION public.pvp_view(p_duel_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  d record;
  is_ch boolean;
  ch_username text;
  opp_username text;
  win_username text := NULL;
  safe_ch_cards integer[];
  safe_opp_cards integer[];
  safe_ch_score integer;
  safe_opp_score integer;
  safe_deck integer[];
  my_cards integer[];
  my_score integer;
  opp_cards_count integer;
  pot integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_duel_id IS NOT NULL THEN
    SELECT * INTO d FROM public.pvp_duels WHERE id = p_duel_id;
  ELSE
    SELECT * INTO d FROM public.pvp_duels
    WHERE (challenger_id = uid OR opponent_id = uid)
      AND game_type = 'blackjack'
      AND status IN ('playing', 'completed')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF d IS NULL OR d.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Перевірка чи auth.uid() є дійсним учасником дуелі
  IF uid != d.challenger_id AND uid != d.opponent_id THEN
    RAISE EXCEPTION 'unauthorized_not_participant';
  END IF;

  is_ch := (uid = d.challenger_id);

  SELECT username INTO ch_username FROM public.profiles WHERE id = d.challenger_id;
  SELECT username INTO opp_username FROM public.profiles WHERE id = d.opponent_id;

  IF d.winner_id = d.challenger_id THEN
    win_username := coalesce(ch_username, 'Гравець 1');
  ELSIF d.winner_id = d.opponent_id THEN
    win_username := coalesce(opp_username, 'Гравець 2');
  END IF;

  pot := d.stake * 2;

  -- Розрахунок маскування закритих карт:
  -- Суперник бачить лише заглушки [-1, -1] та score = -1, колода = NULL,
  -- доки статус гри не стане 'completed'.
  IF d.status = 'completed' THEN
    safe_ch_cards := coalesce(d.challenger_cards, '{}'::integer[]);
    safe_opp_cards := coalesce(d.opponent_cards, '{}'::integer[]);
    safe_ch_score := coalesce(d.challenger_score, 0);
    safe_opp_score := coalesce(d.opponent_score, 0);
    safe_deck := d.deck;
  ELSE
    safe_deck := NULL; -- Колода закрита до кінця гри
    IF is_ch THEN
      safe_ch_cards := coalesce(d.challenger_cards, '{}'::integer[]);
      safe_ch_score := coalesce(d.challenger_score, 0);
      opp_cards_count := coalesce(array_length(d.opponent_cards, 1), 0);
      safe_opp_cards := CASE WHEN opp_cards_count > 0 THEN array_fill(-1, ARRAY[opp_cards_count]) ELSE '{}'::integer[] END;
      safe_opp_score := -1; -- Приховано
    ELSE
      safe_opp_cards := coalesce(d.opponent_cards, '{}'::integer[]);
      safe_opp_score := coalesce(d.opponent_score, 0);
      opp_cards_count := coalesce(array_length(d.challenger_cards, 1), 0);
      safe_ch_cards := CASE WHEN opp_cards_count > 0 THEN array_fill(-1, ARRAY[opp_cards_count]) ELSE '{}'::integer[] END;
      safe_ch_score := -1; -- Приховано
    END IF;
  END IF;

  my_cards := CASE WHEN is_ch THEN safe_ch_cards ELSE safe_opp_cards END;
  my_score := CASE WHEN is_ch THEN safe_ch_score ELSE safe_opp_score END;

  RETURN jsonb_build_object(
    'duel_id', d.id,
    'challenger_id', d.challenger_id,
    'opponent_id', d.opponent_id,
    'challenger_name', coalesce(ch_username, 'Гравець 1'),
    'opponent_name', coalesce(opp_username, 'Гравець 2'),
    'stake', d.stake,
    'currency', d.currency,
    'status', d.status,
    'current_turn', d.current_turn,
    'challenger_finished', coalesce(d.challenger_finished, false),
    'opponent_finished', coalesce(d.opponent_finished, false),
    'winner_id', d.winner_id,
    'winner_name', win_username,
    'pot', pot,
    'challenger_cards', safe_ch_cards,
    'opponent_cards', safe_opp_cards,
    'challenger_score', safe_ch_score,
    'opponent_score', safe_opp_score,
    'my_cards', my_cards,
    'my_score', my_score,
    'deck', safe_deck,
    'last_move_at', coalesce(d.last_move_at, d.created_at),
    'created_at', d.created_at
  );
END;
$$;

-- 4. Оновлена функція respond_duel_invite з FOR UPDATE, захистом від гонок та маскуванням карт
CREATE OR REPLACE FUNCTION public.respond_duel_invite(
  p_duel_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Атомарне блокування рядка дуелі для усунення подвійного кліку / гонок
  SELECT * INTO d FROM public.pvp_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'duel_not_found';
  END IF;

  -- Ідемпотентність: якщо вже скасовано або відхилено
  IF p_action = 'decline' OR p_action = 'cancel' THEN
    IF d.status = 'declined' OR d.status = 'cancelled' THEN
      RETURN jsonb_build_object('success', true, 'status', d.status, 'already_handled', true);
    END IF;
    IF d.status != 'pending' THEN
      RAISE EXCEPTION 'duel_not_pending';
    END IF;

    IF uid != d.opponent_id AND uid != d.challenger_id THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;

    -- Повернення ставки челенджеру з блокуванням балансу
    IF d.currency = 'coins' THEN
      UPDATE public.profiles SET coins = coins + d.stake WHERE id = d.challenger_id;
    ELSE
      UPDATE public.profiles SET hohlyantsi = hohlyantsi + d.stake WHERE id = d.challenger_id;
    END IF;

    UPDATE public.pvp_duels 
    SET status = 'declined', 
        last_move_at = now() 
    WHERE id = p_duel_id;

    RETURN jsonb_build_object('success', true, 'status', 'declined');
  END IF;

  -- Прийняття виклику
  IF p_action = 'accept' THEN
    -- Ідемпотентність: якщо дуель уже прийнята і йде/завершена
    IF d.status = 'playing' OR d.status = 'completed' THEN
      RETURN public.pvp_view(p_duel_id);
    END IF;

    IF d.status != 'pending' THEN
      RAISE EXCEPTION 'duel_not_pending';
    END IF;

    IF uid != d.opponent_id THEN
      RAISE EXCEPTION 'only_opponent_can_accept';
    END IF;

    -- Списання ставки з опонента з атомарним блокуванням рядка в profiles
    IF d.currency = 'coins' THEN
      SELECT coins INTO opp_val FROM public.profiles WHERE id = uid FOR UPDATE;
      IF opp_val IS NULL OR opp_val < d.stake THEN
        RAISE EXCEPTION 'Недостатньо золотих монет для ставки!';
      END IF;
      UPDATE public.profiles SET coins = coins - d.stake WHERE id = uid;
    ELSE
      SELECT hohlyantsi INTO opp_val FROM public.profiles WHERE id = uid FOR UPDATE;
      IF opp_val IS NULL OR opp_val < d.stake THEN
        RAISE EXCEPTION 'Недостатньо Хохлянців для ставки!';
      END IF;
      UPDATE public.profiles SET hohlyantsi = hohlyantsi - d.stake WHERE id = uid;
    END IF;

    pot := d.stake * 2;

    -- Кості: миттєвий підрахунок
    IF d.game_type = 'dice' THEN
      ch_dice := array[floor(random() * 6 + 1)::int, floor(random() * 6 + 1)::int];
      opp_dice := array[floor(random() * 6 + 1)::int, floor(random() * 6 + 1)::int];
      ch_score := ch_dice[1] + ch_dice[2];
      opp_score := opp_dice[1] + opp_dice[2];

      IF ch_score > opp_score THEN
        d_winner := d.challenger_id;
      ELSIF opp_score > ch_score THEN
        d_winner := d.opponent_id;
      ELSE
        d_winner := NULL;
      END IF;

      IF d_winner IS NOT NULL THEN
        IF d.currency = 'coins' THEN
          UPDATE public.profiles SET coins = coins + pot WHERE id = d_winner;
        ELSE
          UPDATE public.profiles SET hohlyantsi = hohlyantsi + pot WHERE id = d_winner;
        END IF;
      ELSE
        -- Нічия: повернення ставок обом
        IF d.currency = 'coins' THEN
          UPDATE public.profiles SET coins = coins + d.stake WHERE id = d.challenger_id;
          UPDATE public.profiles SET coins = coins + d.stake WHERE id = d.opponent_id;
        ELSE
          UPDATE public.profiles SET hohlyantsi = hohlyantsi + d.stake WHERE id = d.challenger_id;
          UPDATE public.profiles SET hohlyantsi = hohlyantsi + d.stake WHERE id = d.opponent_id;
        END IF;
      END IF;

      UPDATE public.pvp_duels
      SET status = 'completed',
          winner_id = d_winner,
          challenger_score = ch_score,
          opponent_score = opp_score,
          challenger_roll = ch_dice,
          opponent_roll = opp_dice,
          last_move_at = now()
      WHERE id = p_duel_id;

      RETURN jsonb_build_object(
        'success', true,
        'status', 'completed',
        'challenger_score', ch_score,
        'opponent_score', opp_score,
        'challenger_roll', ch_dice,
        'opponent_roll', opp_dice,
        'winner_id', d_winner,
        'pot', pot
      );

    -- Блекджек: роздача карт і перехід у статус 'playing'
    ELSE
      SELECT array_agg(c ORDER BY random()) INTO shuffled FROM generate_series(0, 51) c;

      ch_hand := array[shuffled[1], shuffled[3]];
      opp_hand := array[shuffled[2], shuffled[4]];
      rem_deck := shuffled[5:52];

      UPDATE public.pvp_duels
      SET status = 'playing',
          deck = rem_deck,
          challenger_cards = ch_hand,
          opponent_cards = opp_hand,
          challenger_score = public.calc_bj_score(ch_hand),
          opponent_score = public.calc_bj_score(opp_hand),
          current_turn = d.challenger_id,
          challenger_finished = false,
          opponent_finished = false,
          last_move_at = now()
      WHERE id = p_duel_id;

      -- Повертає масковане представлення pvp_view (карти супротивника закриті)
      RETURN public.pvp_view(p_duel_id);
    END IF;
  END IF;

  RAISE EXCEPTION 'invalid_action';
END;
$$;

-- 5. Оновлена функція pvp_bj_action з FOR UPDATE, ідемпотентністю та маскуванням
CREATE OR REPLACE FUNCTION public.pvp_bj_action(
  p_duel_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Атомарне блокування рядка дуелі
  SELECT * INTO d FROM public.pvp_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'duel_not_found';
  END IF;

  -- Ідемпотентність: якщо гра вже завершена, просто повертаємо результат
  IF d.status = 'completed' THEN
    RETURN public.pvp_view(p_duel_id);
  END IF;

  IF d.status != 'playing' THEN
    RAISE EXCEPTION 'game_not_playing';
  END IF;

  IF d.current_turn != uid THEN
    RAISE EXCEPTION 'not_your_turn';
  END IF;

  is_ch := (uid = d.challenger_id);
  other_player := CASE WHEN is_ch THEN d.opponent_id ELSE d.challenger_id END;
  ch_fin := coalesce(d.challenger_finished, false);
  opp_fin := coalesce(d.opponent_finished, false);

  -- 1. ДІЯ: HIT (Взяти карту)
  IF p_action = 'hit' THEN
    IF array_length(d.deck, 1) < 1 THEN
      RAISE EXCEPTION 'deck_empty';
    END IF;

    card := d.deck[1];
    rem_deck := d.deck[2:array_length(d.deck, 1)];

    IF is_ch THEN
      new_hand := array_append(d.challenger_cards, card);
      new_score := public.calc_bj_score(new_hand);
      d.challenger_cards := new_hand;
      d.challenger_score := new_score;

      IF new_score >= 21 THEN
        ch_fin := true;
        d.current_turn := other_player;
      END IF;
    ELSE
      new_hand := array_append(d.opponent_cards, card);
      new_score := public.calc_bj_score(new_hand);
      d.opponent_cards := new_hand;
      d.opponent_score := new_score;

      IF new_score >= 21 THEN
        opp_fin := true;
        d.current_turn := other_player;
      END IF;
    END IF;

    d.deck := rem_deck;

  -- 2. ДІЯ: STAND (Зупинитися)
  ELSIF p_action = 'stand' THEN
    IF is_ch THEN
      ch_fin := true;
    ELSE
      opp_fin := true;
    END IF;
    d.current_turn := other_player;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  -- Перевірка чи завершили обидва гравці
  IF ch_fin AND opp_fin THEN
    pot := d.stake * 2;

    IF d.challenger_score > 21 AND d.opponent_score <= 21 THEN
      d_winner := d.opponent_id;
    ELSIF d.opponent_score > 21 AND d.challenger_score <= 21 THEN
      d_winner := d.challenger_id;
    ELSIF d.challenger_score > 21 AND d.opponent_score > 21 THEN
      d_winner := NULL; -- Обидва перебрали (нічия)
    ELSIF d.challenger_score > d.opponent_score THEN
      d_winner := d.challenger_id;
    ELSIF d.opponent_score > d.challenger_score THEN
      d_winner := d.opponent_id;
    ELSE
      d_winner := NULL; -- Нічия
    END IF;

    IF d_winner IS NOT NULL THEN
      IF d.currency = 'coins' THEN
        UPDATE public.profiles SET coins = coins + pot WHERE id = d_winner;
      ELSE
        UPDATE public.profiles SET hohlyantsi = hohlyantsi + pot WHERE id = d_winner;
      END IF;
    ELSE
      -- Повернення ставок при нічиїй
      IF d.currency = 'coins' THEN
        UPDATE public.profiles SET coins = coins + d.stake WHERE id = d.challenger_id;
        UPDATE public.profiles SET coins = coins + d.stake WHERE id = d.opponent_id;
      ELSE
        UPDATE public.profiles SET hohlyantsi = hohlyantsi + d.stake WHERE id = d.challenger_id;
        UPDATE public.profiles SET hohlyantsi = hohlyantsi + d.stake WHERE id = d.opponent_id;
      END IF;
    END IF;

    UPDATE public.pvp_duels
    SET status = 'completed',
        winner_id = d_winner,
        challenger_finished = true,
        opponent_finished = true,
        deck = d.deck,
        challenger_cards = d.challenger_cards,
        opponent_cards = d.opponent_cards,
        challenger_score = d.challenger_score,
        opponent_score = d.opponent_score,
        last_move_at = now()
    WHERE id = p_duel_id;

    RETURN public.pvp_view(p_duel_id);
  ELSE
    -- Партія триває далі
    UPDATE public.pvp_duels
    SET deck = d.deck,
        challenger_cards = d.challenger_cards,
        opponent_cards = d.opponent_cards,
        challenger_score = d.challenger_score,
        opponent_score = d.opponent_score,
        current_turn = d.current_turn,
        challenger_finished = ch_fin,
        opponent_finished = opp_fin,
        last_move_at = now()
    WHERE id = p_duel_id;

    RETURN public.pvp_view(p_duel_id);
  END IF;
END;
$$;

-- 6. Функція claim_duel_timeout: технічна поразка й автовиплата при неявці (> 60 сек)
CREATE OR REPLACE FUNCTION public.claim_duel_timeout(p_duel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  d record;
  idle_player uuid;
  winner_uid uuid;
  pot integer;
  sec_elapsed integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO d FROM public.pvp_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'duel_not_found';
  END IF;

  IF uid != d.challenger_id AND uid != d.opponent_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF d.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true, 'winner_id', d.winner_id);
  END IF;

  IF d.status != 'playing' THEN
    RAISE EXCEPTION 'duel_not_in_play';
  END IF;

  -- Перевірка 60 секунд бездіяльності за колонкою last_move_at
  sec_elapsed := extract(epoch from (now() - coalesce(d.last_move_at, d.created_at)))::int;
  IF sec_elapsed < 60 THEN
    RAISE EXCEPTION 'Таймаут ще не настав! Зачекайте ще % сек.', (60 - sec_elapsed);
  END IF;

  -- Той, чий зараз хід і хто не зробив дію, отримує технічну поразку
  idle_player := coalesce(d.current_turn, d.challenger_id);
  winner_uid := CASE WHEN idle_player = d.challenger_id THEN d.opponent_id ELSE d.challenger_id END;
  pot := d.stake * 2;

  -- Атомарна виплата виграшу очікуючому учаснику
  IF d.currency = 'coins' THEN
    UPDATE public.profiles SET coins = coins + pot WHERE id = winner_uid;
  ELSE
    UPDATE public.profiles SET hohlyantsi = hohlyantsi + pot WHERE id = winner_uid;
  END IF;

  UPDATE public.pvp_duels
  SET status = 'completed',
      winner_id = winner_uid,
      challenger_finished = true,
      opponent_finished = true,
      last_move_at = now()
  WHERE id = p_duel_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'winner_id', winner_uid,
    'pot', pot,
    'reason', 'timeout'
  );
END;
$$;

-- 7. Серверний кулдаун для open_loot_box
CREATE OR REPLACE FUNCTION public.open_loot_box(p_box_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  u record;
  coins_reward integer := 0;
  xp_reward integer := 0;
  box_title text := '';
  cooldown_minutes integer := 1440; -- 24 години
  sec_elapsed integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, last_box_at INTO u FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF u.last_box_at IS NOT NULL THEN
    sec_elapsed := extract(epoch from (now() - u.last_box_at))::int;
    IF sec_elapsed < (cooldown_minutes * 60) THEN
      RAISE EXCEPTION 'Кейс можна відкривати лише раз на добу! Залишилося чекати % хв.', ((cooldown_minutes * 60 - sec_elapsed) / 60);
    END IF;
  END IF;

  IF p_box_type = 'khokhlov' THEN
    box_title := 'Хохловська заначка';
    coins_reward := 500 + floor(random() * 300)::int;
    xp_reward := 60;
  ELSIF p_box_type = 'marchenko' THEN
    box_title := 'Світ Марченка';
    coins_reward := 20000 + floor(random() * 5000)::int;
    xp_reward := 400;
  ELSIF p_box_type = 'admin' THEN
    box_title := 'Адміновська долина';
    coins_reward := 1000000;
    xp_reward := 5000;
  ELSE
    RAISE EXCEPTION 'invalid_box_type';
  END IF;

  UPDATE public.profiles
  SET coins = coins + coins_reward,
      last_box_at = now()
  WHERE id = uid;

  RETURN jsonb_build_object(
    'success', true,
    'box', box_title,
    'coins', coins_reward,
    'xp', xp_reward,
    'last_box_at', now()
  );
END;
$$;

-- 8. Надання прав на виконання доданих функцій
GRANT EXECUTE ON FUNCTION public.calc_bj_score(integer[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pvp_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_duel_timeout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_duel_invite(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pvp_bj_action(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_loot_box(text) TO authenticated;
