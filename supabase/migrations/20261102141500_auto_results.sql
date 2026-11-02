-- Migration: 20261102141500_auto_results.sql
-- Description: Add external sync columns to matches and apply_auto_result function for service_role.
-- DO NOT APPLY TO DATABASE (Prepared for review).

-- 1. Додавання колонок до таблиці matches (статус 'planned' зберігається)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS result_source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Оновлення обмеження на статус: planned, live, finished, cancelled
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('planned', 'live', 'finished', 'cancelled'));

ALTER TABLE public.matches ALTER COLUMN status SET DEFAULT 'planned';

-- 2. Створення функції apply_auto_result
-- Приймає: p_match_id (UUID), p_home (INT), p_away (INT), p_status (TEXT)
-- Виконується виключно service_role.
-- Без розрахунку виплат або нарахування очок прогнозистам (лише фіксація результату та повернення при скасуванні).
CREATE OR REPLACE FUNCTION public.apply_auto_result(
    p_match_id UUID,
    p_home INT DEFAULT NULL,
    p_away INT DEFAULT NULL,
    p_status TEXT DEFAULT 'finished'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match RECORD;
    v_bet RECORD;
    v_refunded_bets_count INT := 0;
BEGIN
    -- Перевірка валідності статусу
    IF p_status NOT IN ('planned', 'live', 'finished', 'cancelled') THEN
        RAISE EXCEPTION 'invalid_match_status: %', p_status;
    END IF;

    -- Заборона встановлювати статус finished без обох рахунків
    IF p_status = 'finished' AND (p_home IS NULL OR p_away IS NULL) THEN
        RAISE EXCEPTION 'finished_status_requires_both_scores';
    END IF;

    -- Блокування рядка матчу
    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'match_not_found: %', p_match_id;
    END IF;

    -- Логіка для статусу CANCELLED: повернення ставок (refund)
    IF p_status = 'cancelled' THEN
        -- Повернення суми ставки на баланс профілю кожного гравця
        FOR v_bet IN
            SELECT id, user_id, stake
            FROM public.bets
            WHERE match_id = p_match_id AND settled = FALSE
            FOR UPDATE
        LOOP
            UPDATE public.profiles
            SET coins = COALESCE(coins, 0) + v_bet.stake
            WHERE id = v_bet.user_id;

            v_refunded_bets_count := v_refunded_bets_count + 1;
        END LOOP;

        -- Позначаємо всі ставки як повернені (settled = true, payout = stake)
        UPDATE public.bets
        SET settled = TRUE,
            payout = stake
        WHERE match_id = p_match_id AND settled = FALSE;

        -- Оновлюємо статус матчу
        UPDATE public.matches
        SET status = 'cancelled',
            result_source = 'auto',
            last_synced_at = NOW()
        WHERE id = p_match_id;

        RETURN jsonb_build_object(
            'success', TRUE,
            'match_id', p_match_id,
            'status', 'cancelled',
            'refunded_bets', v_refunded_bets_count
        );
    END IF;

    -- Логіка для статусу FINISHED (фіксація результату без виплат та підрахунку очок)
    IF p_status = 'finished' THEN
        UPDATE public.matches
        SET status = 'finished',
            home_score = p_home,
            away_score = p_away,
            result_source = 'auto',
            last_synced_at = NOW()
        WHERE id = p_match_id;

        RETURN jsonb_build_object(
            'success', TRUE,
            'match_id', p_match_id,
            'status', 'finished',
            'home_score', p_home,
            'away_score', p_away
        );
    END IF;

    -- Логіка для статусу LIVE
    IF p_status = 'live' THEN
        UPDATE public.matches
        SET status = 'live',
            home_score = COALESCE(p_home, home_score),
            away_score = COALESCE(p_away, away_score),
            result_source = 'auto',
            last_synced_at = NOW()
        WHERE id = p_match_id;

        RETURN jsonb_build_object(
            'success', TRUE,
            'match_id', p_match_id,
            'status', 'live',
            'home_score', p_home,
            'away_score', p_away
        );
    END IF;

    -- Логіка для статусу PLANNED
    IF p_status = 'planned' THEN
        UPDATE public.matches
        SET status = 'planned',
            last_synced_at = NOW()
        WHERE id = p_match_id;

        RETURN jsonb_build_object(
            'success', TRUE,
            'match_id', p_match_id,
            'status', 'planned'
        );
    END IF;

    RETURN jsonb_build_object('success', FALSE, 'error', 'unhandled_state');
END;
$$;

-- 3. Обмеження прав: дозволено лише service_role, відкликано від public, anon, authenticated
REVOKE ALL ON FUNCTION public.apply_auto_result(UUID, INT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_auto_result(UUID, INT, INT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.apply_auto_result(UUID, INT, INT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_auto_result(UUID, INT, INT, TEXT) TO service_role;

COMMENT ON FUNCTION public.apply_auto_result(UUID, INT, INT, TEXT) IS 'Applies automated match results from external sports API. Strictly restricted to service_role.';

-- ============================================================================
-- 4. Приклад налаштування розкладу через pg_cron (закоментовано за вимогами)
-- ============================================================================
-- Для автоматичного оновлення результатів матчів кожні 2 хвилини через pg_cron
-- та pg_net із заголовком x-cron-secret:
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- SELECT cron.schedule(
--   'sync-football-matches-every-2-min',
--   '*/2 * * * *',
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://<PROJECT-REF>.supabase.co/functions/v1/sync-results',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
--         'x-cron-secret', '<YOUR_CRON_SECRET>'
--       ),
--       body := '{}'::jsonb
--     ) AS request_id;
--   $$
-- );
