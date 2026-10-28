-- ====================================================================
-- MATCHDAY · ЧАСТИНА Б: ОБМЕЖЕННЯ ПОЛІТИК ТА ПРАВ НА ТАБЛИЦЮ PVP_DUELS
-- Файл: supabase/migrations/20261028135001_pvp_security_b.sql
-- Нова політика SELECT лише для учасників, блокування прямих мутацій
-- та revoke select на колонки deck, challenger_cards, opponent_cards.
-- ====================================================================

ALTER TABLE public.pvp_duels ENABLE ROW LEVEL SECURITY;

-- 1. Видалення старих відкритих політик
DROP POLICY IF EXISTS "Authenticated users can view duels" ON public.pvp_duels;
DROP POLICY IF EXISTS "Participants can view duels" ON public.pvp_duels;
DROP POLICY IF EXISTS "Authenticated users can insert duels" ON public.pvp_duels;
DROP POLICY IF EXISTS "Authenticated users can update duels" ON public.pvp_duels;
DROP POLICY IF EXISTS "Authenticated users can delete duels" ON public.pvp_duels;

-- 2. Нова політика: SELECT дозволено ЛИШЕ учасникам конкретної дуелі
CREATE POLICY "Participants can view duels"
ON public.pvp_duels
FOR SELECT
TO authenticated
USING (
  auth.uid() = challenger_id 
  OR auth.uid() = opponent_id
);

-- 3. Заборона прямого INSERT, UPDATE, DELETE для клієнтських запитів
REVOKE INSERT, UPDATE, DELETE ON public.pvp_duels FROM authenticated, anon;

-- 4. Заборона прямого SELECT для колоди та відкритих карт гравців
REVOKE SELECT (deck, challenger_cards, opponent_cards) ON public.pvp_duels FROM authenticated, anon;
