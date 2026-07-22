-- Admin churn-rate time series: aggregate in SQL so the dashboard does not
-- pull every game_save row for this chart (PostgREST traffic / max_rows).
-- Matches shared/churnRateAdminStats.ts semantics (UTC day boundaries).

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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      GREATEST(1, LEAST(COALESCE(p_churn_days, 3), 30)) AS churn_days,
      GREATEST(0, LEAST(COALESCE(p_window_days, 30), 365)) AS window_days
  ),
  base AS (
    SELECT DISTINCT ON (gs.user_id)
      gs.created_at,
      gs.updated_at,
      (
        COALESCE((gs.game_state->'events'->>'cube13')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube14a')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube14b')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube14c')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube14d')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube15a')::boolean, false)
        OR COALESCE((gs.game_state->'events'->>'cube15b')::boolean, false)
      ) AS completed
    FROM game_saves gs
    WHERE gs.user_id IS NOT NULL
      AND COALESCE((gs.game_state->>'referralProcessed')::boolean, false) = false
    ORDER BY gs.user_id, gs.updated_at DESC
  ),
  days AS (
    SELECT (CURRENT_DATE - s.i)::date AS day
    FROM params p
    CROSS JOIN LATERAL generate_series(p.window_days, 0, -1) AS s(i)
  )
  SELECT
    d.day,
    CASE
      WHEN COUNT(b.created_at) = 0 THEN 0
      ELSE ROUND(
        100.0 * COUNT(*) FILTER (
          WHERE NOT b.completed
            AND b.updated_at < ((d.day - p.churn_days + 1)::timestamp)
        ) / COUNT(b.created_at)
      )::integer
    END AS churn_rate,
    COUNT(*) FILTER (
      WHERE NOT b.completed
        AND b.updated_at < ((d.day - p.churn_days + 1)::timestamp)
    )::bigint AS churned_count,
    COUNT(b.created_at)::bigint AS eligible_count
  FROM days d
  CROSS JOIN params p
  LEFT JOIN base b ON b.created_at < ((d.day + 1)::timestamp)
  GROUP BY d.day, p.churn_days
  ORDER BY d.day;
$$;

REVOKE ALL ON FUNCTION public.admin_churn_rate_over_time(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_churn_rate_over_time(integer, integer) TO service_role;
