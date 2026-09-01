-- Daily / hourly admin sign-up charts: count auth account creation, not first
-- cloud save. game_saves.created_at can lag (or never happen) and still includes
-- anonymized deleted-account rows. Matches Total Users and buyers/gain per 100.
-- Deleted accounts drop out of live auth.users, so historical days can shrink.

CREATE OR REPLACE FUNCTION public.get_daily_signups(days_back integer DEFAULT 365)
RETURNS TABLE(day date, signups integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (u.created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*)::integer AS signups
  FROM auth.users u
  WHERE (u.created_at AT TIME ZONE 'UTC')::date
    >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - days_back
  GROUP BY 1
  ORDER BY 1 ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_hourly_signups()
RETURNS TABLE(hour_start timestamptz, signups integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    DATE_TRUNC('hour', u.created_at) AS hour_start,
    COUNT(*)::integer AS signups
  FROM auth.users u
  WHERE u.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY 1
  ORDER BY 1 ASC;
$$;

REVOKE ALL ON FUNCTION public.get_daily_signups(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_signups(integer) TO service_role;

REVOKE ALL ON FUNCTION public.get_hourly_signups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hourly_signups() TO service_role;
