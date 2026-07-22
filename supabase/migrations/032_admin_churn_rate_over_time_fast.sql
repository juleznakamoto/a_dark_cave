-- Faster churn-rate series: one scan of game_saves, then cumulative sums by day.
-- Fixes statement timeout from 031's days×users join on 90–365 day windows.

CREATE OR REPLACE FUNCTION public.admin_churn_rate_over_time(
  p_churn_days integer DEFAULT 3,
  p_window_days integer DEFAULT 30
)
RETURNS TABLE (
  day date,
  churn_rate integer,
  churned_count bigint,
  eligible_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  v_churn_days integer := GREATEST(1, LEAST(COALESCE(p_churn_days, 3), 30));
  v_window_days integer := GREATEST(0, LEAST(COALESCE(p_window_days, 30), 365));
  v_window_start date := (CURRENT_DATE - v_window_days)::date;
BEGIN
  RETURN QUERY
  WITH base AS MATERIALIZED (
    SELECT
      (gs.created_at AT TIME ZONE 'UTC')::date AS created_day,
      (gs.updated_at AT TIME ZONE 'UTC')::date AS updated_day,
      (
        COALESCE((gs.game_state->'events'->>'cube13')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube14a')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube14b')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube14c')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube14d')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube15a')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube15b')::boolean, false)
      ) AS completed
    FROM (
      SELECT DISTINCT ON (s.user_id)
        s.created_at,
        s.updated_at,
        s.game_state
      FROM game_saves s
      WHERE s.user_id IS NOT NULL
        AND (s.game_state->>'referralProcessed') IS DISTINCT FROM 'true'
      ORDER BY s.user_id, s.updated_at DESC NULLS LAST
    ) gs
  ),
  days AS (
    SELECT g::date AS day
    FROM generate_series(v_window_start, CURRENT_DATE, '1 day'::interval) AS g
  ),
  create_hist AS (
    SELECT
      CASE
        WHEN b.created_day < v_window_start THEN v_window_start
        ELSE b.created_day
      END AS day,
      COUNT(*)::bigint AS n
    FROM base b
    WHERE b.created_day <= CURRENT_DATE
    GROUP BY 1
  ),
  churn_hist AS (
    SELECT
      CASE
        WHEN onset < v_window_start THEN v_window_start
        ELSE onset
      END AS day,
      COUNT(*)::bigint AS n
    FROM (
      SELECT GREATEST(b.created_day, b.updated_day + v_churn_days) AS onset
      FROM base b
      WHERE NOT b.completed
    ) x
    WHERE onset <= CURRENT_DATE
    GROUP BY 1
  ),
  daily AS (
    SELECT
      d.day,
      COALESCE(c.n, 0)::bigint AS created_n,
      COALESCE(h.n, 0)::bigint AS churn_n
    FROM days d
    LEFT JOIN create_hist c ON c.day = d.day
    LEFT JOIN churn_hist h ON h.day = d.day
  ),
  cum AS (
    SELECT
      d.day,
      SUM(d.created_n) OVER (ORDER BY d.day)::bigint AS eligible_count,
      SUM(d.churn_n) OVER (ORDER BY d.day)::bigint AS churned_count
    FROM daily d
  )
  SELECT
    c.day,
    CASE
      WHEN c.eligible_count = 0 THEN 0
      ELSE ROUND(100.0 * c.churned_count / c.eligible_count)::integer
    END AS churn_rate,
    c.churned_count,
    c.eligible_count
  FROM cum c
  ORDER BY c.day;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_churn_rate_over_time(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_churn_rate_over_time(integer, integer) TO service_role;
