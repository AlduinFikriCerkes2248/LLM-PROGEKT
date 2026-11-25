-- ====================================================================
-- MATCHDAY · ОНОВЛЕННЯ БАЗИ ДАНИХ: ДОСЯГНЕННЯ ТА ПРОМОКОДИ
-- Скопіюйте цей SQL та виконайте у Supabase SQL Editor на https://supabase.com
-- ====================================================================

-- 1. Переконуємось, що поля coins, hohlyantsi та bj_xp існують у profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 1088233 CHECK (coins >= 0);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hohlyantsi integer NOT NULL DEFAULT 45 CHECK (hohlyantsi >= 0);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bj_xp integer NOT NULL DEFAULT 0;

-- 2. Надаємо права на оновлення власних полів coins, hohlyantsi та bj_xp
GRANT UPDATE(coins, hohlyantsi, bj_xp, username) ON public.profiles TO authenticated;

-- Переконуємось, що політика RLS дозволяє редагування свого профілю
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Таблиця збереження досягнень користувачів
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
CREATE POLICY "user_achievements_select_own" ON public.user_achievements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_achievements_all_own" ON public.user_achievements;
CREATE POLICY "user_achievements_all_own" ON public.user_achievements
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.user_achievements TO authenticated;

-- 4. Таблиця збереження активованих промокодів
CREATE TABLE IF NOT EXISTS public.user_promocodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  promo_code text NOT NULL,
  coins_reward integer NOT NULL DEFAULT 0,
  bonuses_reward integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promo_code)
);

ALTER TABLE public.user_promocodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_promocodes_select_own" ON public.user_promocodes;
CREATE POLICY "user_promocodes_select_own" ON public.user_promocodes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT ALL ON public.user_promocodes TO authenticated;

-- 5. RPC функція для нарахування нагороди за досягнення (атомарно, безпечно та з захистом від повтору)
CREATE OR REPLACE FUNCTION public.claim_achievement_reward(
  p_achievement_id text,
  p_coins integer,
  p_bonuses integer DEFAULT 0,
  p_xp integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_coins integer;
  new_bonuses integer;
  new_xp integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Перевіряємо чи вже не було забрано нагороду в базі
  IF EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = uid AND achievement_id = p_achievement_id AND claimed = true
  ) THEN
    SELECT coalesce(coins, 1088233), coalesce(hohlyantsi, 45), coalesce(bj_xp, 0)
    INTO new_coins, new_bonuses, new_xp
    FROM public.profiles WHERE id = uid;

    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'coins', new_coins,
      'hohlyantsi', new_bonuses,
      'xp', new_xp
    );
  END IF;

  -- Оновлюємо або створюємо запис про досягнення
  INSERT INTO public.user_achievements (user_id, achievement_id, completed, claimed, claimed_at, updated_at)
  VALUES (uid, p_achievement_id, true, true, now(), now())
  ON CONFLICT (user_id, achievement_id) DO UPDATE SET
    completed = true,
    claimed = true,
    claimed_at = now(),
    updated_at = now();

  -- Нараховуємо монети, бонуси та досвід на баланс користувача
  UPDATE public.profiles
  SET 
    coins = coalesce(coins, 1088233) + coalesce(p_coins, 0),
    hohlyantsi = coalesce(hohlyantsi, 45) + coalesce(p_bonuses, 0),
    bj_xp = coalesce(bj_xp, 0) + coalesce(p_xp, 0)
  WHERE id = uid
  RETURNING coins, hohlyantsi, bj_xp
  INTO new_coins, new_bonuses, new_xp;

  RETURN jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'coins', new_coins,
    'hohlyantsi', new_bonuses,
    'xp', new_xp
  );
END;
$$;

-- 6. RPC функція для активації промокоду / великодки
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code text,
  p_coins integer,
  p_bonuses integer DEFAULT 0,
  p_xp integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  clean_code text := upper(trim(p_code));
  new_coins integer;
  new_bonuses integer;
  new_xp integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF clean_code IS NULL OR clean_code = '' THEN
    RAISE EXCEPTION 'empty_code';
  END IF;

  -- Перевірка чи не активовано вже цей промокод
  IF EXISTS (
    SELECT 1 FROM public.user_promocodes 
    WHERE user_id = uid AND promo_code = clean_code
  ) THEN
    RAISE EXCEPTION 'promo_already_redeemed';
  END IF;

  -- Фіксуємо активацію промокоду
  INSERT INTO public.user_promocodes (user_id, promo_code, coins_reward, bonuses_reward, xp_reward, redeemed_at)
  VALUES (uid, clean_code, coalesce(p_coins, 0), coalesce(p_bonuses, 0), coalesce(p_xp, 0), now());

  -- Нараховуємо винагороду на баланс
  UPDATE public.profiles
  SET 
    coins = coalesce(coins, 1088233) + coalesce(p_coins, 0),
    hohlyantsi = coalesce(hohlyantsi, 45) + coalesce(p_bonuses, 0),
    bj_xp = coalesce(bj_xp, 0) + coalesce(p_xp, 0)
  WHERE id = uid
  RETURNING coins, hohlyantsi, bj_xp
  INTO new_coins, new_bonuses, new_xp;

  RETURN jsonb_build_object(
    'success', true,
    'code', clean_code,
    'coins', new_coins,
    'hohlyantsi', new_bonuses,
    'xp', new_xp
  );
END;
$$;

-- 7. Дозволи виконання RPC для авторизованих користувачів
GRANT EXECUTE ON FUNCTION public.claim_achievement_reward(text, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, integer, integer, integer) TO authenticated;
