-- ====================================================================
-- MATCHDAY · СЕРВЕРНИЙ КУЛДАУН ЛУТБОКСІВ ТА ЗАХИСТ ВІД RACE CONDITIONS
-- Файл: supabase/migrations/20261031113000_loot_cooldown.sql
-- ====================================================================

-- 1. Додавання колонки last_loot_at до таблиці profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_loot_at timestamptz;

-- Синхронізація зі старою колонкою last_box_at, якщо вона існувала
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_box_at'
  ) THEN
    UPDATE public.profiles
    SET last_loot_at = last_box_at
    WHERE last_loot_at IS NULL AND last_box_at IS NOT NULL;
  END IF;
END $$;

-- 2. Оновлення функції open_loot_box з блокуванням рядка FOR UPDATE та перевіркою кулдауну
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
  cooldown_minutes integer := 1440; -- Кулдаун 24 години (1440 хвилин)
  sec_elapsed integer;
BEGIN
  -- Перевірка автентифікації користувача
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Атомарне блокування рядка профілю для запобігання паралельним запитам (race condition)
  SELECT id, last_loot_at INTO u
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- Перевірка кулдауну
  IF u.last_loot_at IS NOT NULL THEN
    sec_elapsed := extract(epoch from (now() - u.last_loot_at))::int;
    IF sec_elapsed < (cooldown_minutes * 60) THEN
      RAISE EXCEPTION 'Кейс можна відкривати лише раз на добу! Залишилося чекати % хв.', ((cooldown_minutes * 60 - sec_elapsed) / 60);
    END IF;
  END IF;

  -- Визначення нагороди та нейтральної назви кейсу
  IF p_box_type = 'khokhlov' OR p_box_type = 'starter' THEN
    box_title := 'Стартовий кейс';
    coins_reward := 500 + floor(random() * 300)::int;
    xp_reward := 60;
  ELSIF p_box_type = 'marchenko' OR p_box_type = 'pro' THEN
    box_title := 'PRO-кейс';
    coins_reward := 20000 + floor(random() * 5000)::int;
    xp_reward := 400;
  ELSIF p_box_type = 'admin' OR p_box_type = 'vip' THEN
    box_title := 'VIP-кейс';
    coins_reward := 1000000;
    xp_reward := 5000;
  ELSE
    RAISE EXCEPTION 'invalid_box_type';
  END IF;

  -- Оновлення балансу та фіксація точного серверного часу відкриття
  UPDATE public.profiles
  SET coins = coins + coins_reward,
      last_loot_at = now()
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

-- Надання прав на виконання авторизованим користувачам
GRANT EXECUTE ON FUNCTION public.open_loot_box(text) TO authenticated;
