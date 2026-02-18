-- Functions to compute DAU/WAU/MAU and signup aggregates server-side.
-- This avoids the PostgREST max_rows cap when fetching raw game_saves to the application layer.

CREATE OR REPLACE FUNCTION get_daily_active_users()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT user_id)::integer
  FROM game_saves
  WHERE updated_at >= CURRENT_DATE
    AND updated_at < CURRENT_DATE + INTERVAL '1 day';
$$;

CREATE OR REPLACE FUNCTION get_weekly_active_users()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT user_id)::integer
  FROM game_saves
  WHERE updated_at >= NOW() - INTERVAL '7 days';
$$;

CREATE OR REPLACE FUNCTION get_monthly_active_users()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT user_id)::integer
  FROM game_saves
  WHERE updated_at >= NOW() - INTERVAL '30 days';
$$;

-- Returns daily signup counts for the last N days (default 365).
-- Each row is one calendar day; days with zero signups are omitted.
CREATE OR REPLACE FUNCTION get_daily_signups(days_back integer DEFAULT 365)
RETURNS TABLE(day date, signups integer)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DATE(created_at) AS day, COUNT(*)::integer AS signups
  FROM game_saves
  WHERE created_at >= CURRENT_DATE - days_back
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$;

-- Returns signup counts grouped by hour for the last 24 hours.
-- hour_start is truncated to the hour (e.g. 2024-01-15 14:00:00+00).
CREATE OR REPLACE FUNCTION get_hourly_signups()
RETURNS TABLE(hour_start timestamptz, signups integer)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DATE_TRUNC('hour', created_at) AS hour_start, COUNT(*)::integer AS signups
  FROM game_saves
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY DATE_TRUNC('hour', created_at)
  ORDER BY hour_start ASC;
$$;
