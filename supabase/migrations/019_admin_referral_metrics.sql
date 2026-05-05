-- Admin referral metrics using jsonb_array_elements for efficient historical analysis.
-- Returns aggregates needed by the Referrals tab without loading full game_state rows in the client.
-- SECURITY DEFINER + service_role only, following pattern from 013_admin_dashboard_metrics.sql.

CREATE OR REPLACE FUNCTION public.admin_referral_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH referral_expanded AS (
    SELECT 
      gs.user_id,
      (r->>'timestamp')::bigint as ts_ms,
      to_timestamp(((r->>'timestamp')::bigint)/1000) as referral_date
    FROM game_saves gs
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(gs.game_state->'referrals', '[]'::jsonb)) r
  ),
  daily_stats AS (
    SELECT 
      date_trunc('day', referral_date) as day,
      COUNT(*) as referral_count
    FROM referral_expanded
    GROUP BY day
    ORDER BY day DESC
  )
  SELECT jsonb_build_object(
    'total_referrals', (SELECT COUNT(*)::bigint FROM referral_expanded),
    'users_with_referrals', (SELECT COUNT(DISTINCT user_id)::bigint FROM referral_expanded),
    'daily_referrals', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'day', to_char(day, 'YYYY-MM-DD'),
            'referrals', referral_count
          )
        ),
        '[]'::jsonb
      )
      FROM daily_stats
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Permissions: only service_role (used by admin dashboard) can call this
REVOKE ALL ON FUNCTION public.admin_referral_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_referral_metrics() TO service_role;

COMMENT ON FUNCTION public.admin_referral_metrics() IS 'Returns referral aggregates (total, users with referrals, daily counts) for admin dashboard. Uses jsonb_array_elements for efficiency. Top referrers chart was removed per request.';
