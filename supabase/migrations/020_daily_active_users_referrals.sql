-- Daily referral counts stored alongside DAU in `daily_active_users`.
-- Referrals are counted once per day when `calculate_daily_active_users()` runs (existing pg_cron job).
-- Dashboard reads via `admin_referral_dashboard()` — no full-table JSON scan.

ALTER TABLE public.daily_active_users
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.daily_active_users.referral_count IS 'New referrals whose referral timestamp falls on this UTC calendar date (filled by calculate_daily_active_users).';

-- Extend existing daily job: same schedule as in 003_dau_tracking.sql
CREATE OR REPLACE FUNCTION public.calculate_daily_active_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_active_count INTEGER;
  v_referral_count INTEGER;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date;

  SELECT COUNT(DISTINCT user_id)::integer
  INTO v_active_count
  FROM game_saves
  WHERE user_id IS NOT NULL
    AND (updated_at AT TIME ZONE 'UTC')::date = v_today;

  SELECT COALESCE(COUNT(*), 0)::integer
  INTO v_referral_count
  FROM game_saves gs
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(gs.game_state->'referrals', '[]'::jsonb)) AS r
  WHERE r ? 'timestamp'
    AND (r->>'timestamp') ~ '^[0-9]+$'
    AND (to_timestamp((r->>'timestamp')::bigint / 1000.0) AT TIME ZONE 'UTC')::date = v_today;

  INSERT INTO daily_active_users (date, active_user_count, referral_count)
  VALUES (v_today, COALESCE(v_active_count, 0), COALESCE(v_referral_count, 0))
  ON CONFLICT (date) DO UPDATE SET
    active_user_count = EXCLUDED.active_user_count,
    referral_count = EXCLUDED.referral_count,
    created_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.calculate_daily_active_users IS 'Upserts today''s DAU row and referral_count (UTC date). Scheduled via pg_cron from 003_dau_tracking.sql.';

-- Backfill referral_count on existing rows from source JSON (one-time historical correctness)
UPDATE public.daily_active_users AS dau
SET referral_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT
    (date_trunc(
      'day',
      to_timestamp((r->>'timestamp')::bigint / 1000.0) AT TIME ZONE 'UTC'
    ))::date AS d,
    COUNT(*)::integer AS cnt
  FROM game_saves gs
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(gs.game_state->'referrals', '[]'::jsonb)) AS r
  WHERE r ? 'timestamp'
    AND (r->>'timestamp') ~ '^[0-9]+$'
  GROUP BY 1
) AS sub
WHERE dau.date = sub.d;

-- Days that have referrals but no DAU row yet
INSERT INTO public.daily_active_users (date, active_user_count, referral_count)
SELECT
  sub.d,
  COALESCE(
    (
      SELECT COUNT(DISTINCT gs.user_id)::integer
      FROM game_saves gs
      WHERE gs.user_id IS NOT NULL
        AND (gs.updated_at AT TIME ZONE 'UTC')::date = sub.d
    ),
    0
  ),
  sub.cnt
FROM (
  SELECT
    (date_trunc(
      'day',
      to_timestamp((r->>'timestamp')::bigint / 1000.0) AT TIME ZONE 'UTC'
    ))::date AS d,
    COUNT(*)::integer AS cnt
  FROM game_saves gs
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(gs.game_state->'referrals', '[]'::jsonb)) AS r
  WHERE r ? 'timestamp'
    AND (r->>'timestamp') ~ '^[0-9]+$'
  GROUP BY 1
) AS sub
WHERE NOT EXISTS (
  SELECT 1 FROM public.daily_active_users x WHERE x.date = sub.d
);

-- Compact RPC for admin dashboard (reads only daily_active_users)
CREATE OR REPLACE FUNCTION public.admin_referral_dashboard()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_referrals',
      COALESCE((SELECT SUM(referral_count)::bigint FROM daily_active_users), 0),
    'daily_referrals',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'day', to_char(day_row.dt, 'YYYY-MM-DD'),
              'referrals', day_row.referral_count
            )
            ORDER BY day_row.dt DESC
          )
          FROM (
            SELECT date AS dt, referral_count
            FROM daily_active_users
            ORDER BY date DESC
            LIMIT 800
          ) AS day_row
        ),
        '[]'::jsonb
      )
  );
$$;

REVOKE ALL ON FUNCTION public.admin_referral_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_referral_dashboard() TO service_role;

COMMENT ON FUNCTION public.admin_referral_dashboard IS 'Admin referrals tab: total + recent daily series from daily_active_users.referral_count.';

-- Remove superseded function from migration 019 if present
DROP FUNCTION IF EXISTS public.admin_referral_metrics();
