-- Admin dashboard aggregates: marketing_preferences + anonymized saves, and auth.users rollups.
-- Same security model as 012: SECURITY DEFINER, service_role only.
-- Auth RPC returns total users, registration provider split, and recent sign-up rows (no email-confirmation tiles).

CREATE OR REPLACE FUNCTION public.admin_marketing_dashboard_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH prompted AS (
    SELECT COUNT(*)::bigint AS n FROM marketing_preferences
  ),
  opted AS (
    SELECT COUNT(*)::bigint AS n FROM marketing_preferences WHERE marketing_opt_in = true
  ),
  anon AS (
    SELECT COUNT(*)::bigint AS n FROM game_saves WHERE user_id IS NULL
  )
  SELECT jsonb_build_object(
    'marketing_users_prompted', (SELECT n FROM prompted),
    'marketing_users_opted_in', (SELECT n FROM opted),
    'marketing_opt_in_rate',
      CASE
        WHEN (SELECT n FROM prompted) > 0 THEN
          ROUND(((SELECT n FROM opted)::numeric / (SELECT n FROM prompted)) * 10000) / 100
        ELSE 0::numeric
      END,
    'accounts_deleted_anonymized', (SELECT n FROM anon)
  );
$$;

-- total_user_count, registration_method_stats, auth_signups (2y) — matches server/index.ts consumers.
CREATE OR REPLACE FUNCTION public.admin_auth_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d2y timestamptz := now() - interval '2 years';
  v_total bigint;
  v_reg jsonb;
  v_signups jsonb;
BEGIN
  SELECT COUNT(*)::bigint INTO v_total FROM auth.users;

  SELECT jsonb_build_object(
    'emailRegistrations', COUNT(*) FILTER (WHERE NOT is_google)::bigint,
    'googleRegistrations', COUNT(*) FILTER (WHERE is_google)::bigint
  )
  INTO v_reg
  FROM (
    SELECT
      (
        COALESCE(raw_app_meta_data->>'provider', '') = 'google'
        OR (
          jsonb_typeof(COALESCE(raw_app_meta_data->'providers', '[]'::jsonb)) = 'array'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(raw_app_meta_data->'providers') AS p(val)
            WHERE p.val = 'google'
          )
        )
      ) AS is_google
    FROM auth.users
  ) AS u;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id', id::text, 'created_at', created_at)
      ORDER BY created_at
    ),
    '[]'::jsonb
  )
  INTO v_signups
  FROM auth.users
  WHERE created_at >= d2y;

  RETURN jsonb_build_object(
    'total_user_count', v_total,
    'registration_method_stats', v_reg,
    'auth_signups', v_signups
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_marketing_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_marketing_dashboard_metrics() TO service_role;

REVOKE ALL ON FUNCTION public.admin_auth_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_auth_dashboard_stats() TO service_role;
