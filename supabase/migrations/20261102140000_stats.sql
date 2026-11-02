-- Migration: 20261102140000_stats.sql
-- Description: Player statistics function for league predictions (exact scores, correct outcomes, accuracy, streak)
-- Security: SECURITY DEFINER, SET search_path = public, strict league membership check via auth.uid()

CREATE OR REPLACE FUNCTION public.get_league_member_stats(
    p_league_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    user_id UUID,
    league_id UUID,
    exact_scores BIGINT,
    correct_outcomes BIGINT,
    total_finished_predictions BIGINT,
    accuracy_percentage NUMERIC,
    current_streak INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_calling_user UUID;
    v_target_user UUID;
    v_exact BIGINT := 0;
    v_correct BIGINT := 0;
    v_total BIGINT := 0;
    v_accuracy NUMERIC := 0.0;
    v_streak INT := 0;
    r RECORD;
BEGIN
    v_calling_user := auth.uid();
    IF v_calling_user IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    -- Verify calling user is a member or owner of the league
    IF NOT EXISTS (
        SELECT 1 FROM public.league_members lm
        WHERE lm.league_id = p_league_id AND lm.user_id = v_calling_user
    ) AND NOT EXISTS (
        SELECT 1 FROM public.leagues l
        WHERE l.id = p_league_id AND l.owner_id = v_calling_user
    ) THEN
        RAISE EXCEPTION 'access_denied: not a member of this league';
    END IF;

    v_target_user := COALESCE(p_user_id, v_calling_user);

    -- Calculate exact and outcome counts
    FOR r IN
        SELECT
            p.predicted_home_score,
            p.predicted_away_score,
            m.home_score,
            m.away_score,
            m.match_time
        FROM public.predictions p
        JOIN public.matches m ON m.id = p.match_id
        WHERE m.league_id = p_league_id
          AND p.user_id = v_target_user
          AND m.status = 'finished'
          AND m.home_score IS NOT NULL
          AND m.away_score IS NOT NULL
        ORDER BY m.match_time DESC
    LOOP
        v_total := v_total + 1;

        -- Exact score: 3 points
        IF r.predicted_home_score = r.home_score AND r.predicted_away_score = r.away_score THEN
            v_exact := v_exact + 1;
        -- Correct outcome (home win, away win, or draw): 1 point
        ELSIF (
            (r.home_score > r.away_score AND r.predicted_home_score > r.predicted_away_score) OR
            (r.home_score < r.away_score AND r.predicted_home_score < r.predicted_away_score) OR
            (r.home_score = r.away_score AND r.predicted_home_score = r.predicted_away_score)
        ) THEN
            v_correct := v_correct + 1;
        END IF;
    END LOOP;

    -- Calculate accuracy percentage
    IF v_total > 0 THEN
        v_accuracy := ROUND(((v_exact + v_correct)::NUMERIC / v_total::NUMERIC) * 100.0, 1);
    ELSE
        v_accuracy := 0.0;
    END IF;

    -- Calculate current hit streak (consecutive finished matches with points > 0, from most recent)
    FOR r IN
        SELECT
            p.predicted_home_score,
            p.predicted_away_score,
            m.home_score,
            m.away_score
        FROM public.predictions p
        JOIN public.matches m ON m.id = p.match_id
        WHERE m.league_id = p_league_id
          AND p.user_id = v_target_user
          AND m.status = 'finished'
          AND m.home_score IS NOT NULL
          AND m.away_score IS NOT NULL
        ORDER BY m.match_time DESC
    LOOP
        IF (r.predicted_home_score = r.home_score AND r.predicted_away_score = r.away_score) OR
           (r.home_score > r.away_score AND r.predicted_home_score > r.predicted_away_score) OR
           (r.home_score < r.away_score AND r.predicted_home_score < r.predicted_away_score) OR
           (r.home_score = r.away_score AND r.predicted_home_score = r.predicted_away_score) THEN
            v_streak := v_streak + 1;
        ELSE
            EXIT; -- Streak broken
        END IF;
    END LOOP;

    RETURN QUERY
    SELECT
        v_target_user,
        p_league_id,
        v_exact,
        v_correct,
        v_total,
        v_accuracy,
        v_streak;
END;
$$;

COMMENT ON FUNCTION public.get_league_member_stats(UUID, UUID) IS 'Returns player statistics for a league: exact scores, outcomes, accuracy percentage, and current winning streak. Requires league membership.';
