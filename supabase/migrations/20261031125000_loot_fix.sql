-- ====================================================================
-- MATCHDAY · ОНОВЛЕННЯ ЛУТБОКСІВ (КЛЮЧІ 'starter' / 'pro', ВИДАЛЕННЯ 'admin')
-- Файл: supabase/migrations/20261031125000_loot_fix.sql
-- ====================================================================

-- 1. Оновлення безкоштовного щоденного кейсу open_loot_box
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
  cooldown_minutes integer := 1440; -- Кулдаун 24 години
  sec_elapsed integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Атомарне блокування рядка профілю
  SELECT id, last_loot_at, last_box_at INTO u
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- Перевірка кулдауну
  IF COALESCE(u.last_loot_at, u.last_box_at) IS NOT NULL THEN
    sec_elapsed := extract(epoch from (now() - COALESCE(u.last_loot_at, u.last_box_at)))::int;
    IF sec_elapsed < (cooldown_minutes * 60) THEN
      RAISE EXCEPTION 'Кейс можна відкривати лише раз на добу! Залишилося чекати % хв.', ((cooldown_minutes * 60 - sec_elapsed) / 60);
    END IF;
  END IF;

  -- Лише 'starter' та 'pro' (гілку 'admin' повністю видалено)
  IF p_box_type = 'starter' THEN
    box_title := 'Кейс 1';
    coins_reward := 500 + floor(random() * 300)::int;
    xp_reward := 60;
  ELSIF p_box_type = 'pro' THEN
    box_title := 'Кейс 2';
    coins_reward := 20000 + floor(random() * 5000)::int;
    xp_reward := 400;
  ELSE
    RAISE EXCEPTION 'invalid_box_type';
  END IF;

  -- Оновлення балансу та фіксація часу
  UPDATE public.profiles
  SET coins = coins + coins_reward,
      last_loot_at = now(),
      last_box_at = now()
  WHERE id = uid;

  RETURN jsonb_build_object(
    'success', true,
    'box', box_title,
    'coins', coins_reward,
    'xp', xp_reward,
    'last_loot_at', now()
  );
END;
$$;

-- 2. Оновлення купівлі кейсів за бонуси buy_case_with_hohlyantsi
CREATE OR REPLACE FUNCTION public.buy_case_with_hohlyantsi(p_box_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  u record;
  cost integer := 0;
  coins_reward integer := 0;
  xp_reward integer := 0;
  box_title text := '';
  new_hohlyantsi integer;
  new_coins integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Визначення параметрів кейсу: лише 'starter' та 'pro'
  IF p_box_type = 'starter' THEN
    cost := 5;
    box_title := 'Кейс 1';
    coins_reward := 500 + floor(random() * 300)::int;
    xp_reward := 60;
  ELSIF p_box_type = 'pro' THEN
    cost := 25;
    box_title := 'Кейс 2';
    coins_reward := 20000 + floor(random() * 5000)::int;
    xp_reward := 400;
  ELSE
    RAISE EXCEPTION 'invalid_box_type';
  END IF;

  -- Атомарне блокування рядка профілю
  SELECT id, hohlyantsi, coins INTO u
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF u.hohlyantsi IS NULL OR u.hohlyantsi < cost THEN
    RAISE EXCEPTION 'insufficient_hohlyantsi';
  END IF;

  -- Списання додаткової валюти та нарахування монет
  UPDATE public.profiles
  SET hohlyantsi = hohlyantsi - cost,
      coins = coins + coins_reward
  WHERE id = uid;

  SELECT coins, hohlyantsi INTO new_coins, new_hohlyantsi
  FROM public.profiles
  WHERE id = uid;

  RETURN jsonb_build_object(
    'success', true,
    'box', box_title,
    'coins_added', coins_reward,
    'xp_added', xp_reward,
    'cost', cost,
    'new_coins', new_coins,
    'hohlyantsi', new_hohlyantsi
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_loot_box(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_case_with_hohlyantsi(text) TO authenticated;
