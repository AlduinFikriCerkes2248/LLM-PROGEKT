-- Migration: 20261102141500_auto_results.sql
-- Description: Add external sync columns to matches and apply_auto_result function for service_role.
-- DO NOT APPLY TO DATABASE (Prepared for review).

-- 1. Додавання колонок до таблиці matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS result_source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Міграція існуючих значень статусу (planned -> scheduled)
UPDATE public.matches
SET status = 'scheduled'
WHERE status = 'planned';

-- Оновлення обмеження на статус: scheduled, live, finished, cancelled
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled'));

ALTER TABLE public.matches ALTER COLUMN status SET DEFAULT 'scheduled';

-- 2. Створення функції apply_auto_result
-- Приймає: p_match_id (UUID), p_home (INT), p_away (INT), p_status (TEXT)
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
    v_winning_pick TEXT;
    v_total_pool BIGINT := 0;
    v_winning_pool BIGINT := 0;
    v_ratio NUMERIC := 1.0;
    v_refunded_bets_count INT := 0;
    v_settled_bets_count INT := 0;
    v_updated_predictions_count INT := 0;
BEGIN
    -- Перевірка валідності статусу
    IF p_status NOT IN ('scheduled', 'live', 'finished', 'cancelled') THEN
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

    -- Логіка для статусу FINISHED
    IF p_status = 'finished' THEN
        -- Оновлення матчу
        UPDATE public.matches
        SET status = 'finished',
            home_score = p_home,
            away_score = p_away,
            result_source = 'auto',
            last_synced_at = NOW()
        WHERE id = p_match_id;

        -- 1. Розрахунок балів за прогнози
        -- 3 бали за точний рахунок, 1 бал за вгаданий результат (перемога господарів, гостей чи нічия), 0 інакше
        WITH updated AS (
            UPDATE public.predictions
            SET points_earned = CASE
                WHEN predicted_home_score = p_home AND predicted_away_score = p_away THEN 3
                WHEN (p_home > p_away AND predicted_home_score > predicted_away_score) OR
                     (p_home < p_away AND predicted_home_score < predicted_away_score) OR
                     (p_home = p_away AND predicted_home_score = predicted_away_score) THEN 1
                ELSE 0
            END
            WHERE match_id = p_match_id
            RETURNING id
        )
        SELECT COUNT(*) INTO v_updated_predictions_count FROM updated;

        -- 2. Розрахунок та виплата пулу ставок (bets)
        IF p_home > p_away THEN
            v_winning_pick := 'home';
        ELSIF p_away > p_home THEN
            v_winning_pick := 'away';
        ELSE
            v_winning_pick := 'draw';
        END IF;

        SELECT COALESCE(SUM(stake), 0) INTO v_total_pool
        FROM public.bets
        WHERE match_id = p_match_id;

        SELECT COALESCE(SUM(stake), 0) INTO v_winning_pool
        FROM public.bets
        WHERE match_id = p_match_id AND pick = v_winning_pick;

        IF v_winning_pool > 0 AND v_total_pool > 0 THEN
            v_ratio := v_total_pool::NUMERIC / v_winning_pool::NUMERIC;

            -- Виплата виграшних ставок
            FOR v_bet IN
                SELECT id, user_id, stake
                FROM public.bets
                WHERE match_id = p_match_id AND pick = v_winning_pick AND settled = FALSE
                FOR UPDATE
            LOOP
                DECLARE
                    v_payout BIGINT := FLOOR(v_bet.stake * v_ratio)::BIGINT;
                BEGIN
                    UPDATE public.profiles
                    SET coins = COALESCE(coins, 0) + v_payout
                    WHERE id = v_bet.user_id;

                    UPDATE public.bets
                    SET settled = TRUE,
                        payout = v_payout
                    WHERE id = v_bet.id;

                    v_settled_bets_count := v_settled_bets_count + 1;
                END;
            END LOOP;
        END IF;

        -- Позначаємо всі незіграні ставки програними (settled = true, payout = 0)
        UPDATE public.bets
        SET settled = TRUE,
            payout = 0
        WHERE match_id = p_match_id AND settled = FALSE;

        RETURN jsonb_build_object(
            'success', TRUE,
            'match_id', p_match_id,
            'status', 'finished',
            'home_score', p_home,
            'away_score', p_away,
            'updated_predictions', v_updated_predictions_count,
            'winning_bets_settled', v_settled_bets_count
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

    -- Логіка для статусу SCHEDULED
    IF p_status = 'scheduled' THEN
        UPDATE public.matches
        SET status = 'scheduled',
            last_synced_at = NOW()
        WHERE id = p_match_id;

        RETURN jsonb_build_object(
            'success', TRUE,
            'match_id', p_match_id,
            'status', 'scheduled'
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
-- Для автоматичного оновлення результатів матчів кожні 2 хвилини через розширення pg_cron
-- та pg_net, додайте такий розклад у консолі Supabase SQL Editor:
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
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
--       ),
--       body := '{}'::jsonb
--     ) AS request_id;
--   $$
-- );
