-- Fix Traffic tab timeouts (full game_saves jsonb scan) and add session vs UTM coverage.
-- Partial index lets attributed-save aggregates touch only rows that may have UTM.
-- Session totals come from session_visits (same anonymous traffic the Sessions tab uses).

CREATE INDEX IF NOT EXISTS idx_game_saves_has_utm_attribution
  ON public.game_saves (created_at)
  WHERE (game_state -> 'utmAttribution') IS NOT NULL
     OR NULLIF(BTRIM(game_state ->> 'googleAdsSource'), '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_utm_dashboard(days_back INTEGER DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '30s'
AS $$
DECLARE
  v_days INTEGER := GREATEST(1, LEAST(COALESCE(days_back, 90), 800));
  v_from DATE := ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date) - v_days;
  v_today DATE := ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date);
BEGIN
  RETURN (
    WITH landings AS MATERIALIZED (
      SELECT *
      FROM utm_landings
      WHERE visit_date >= v_from
    ),
    sessions AS MATERIALIZED (
      SELECT session_id, visit_date
      FROM session_visits
      WHERE visit_date >= v_from
    ),
    attributed AS MATERIALIZED (
      SELECT
        gs.user_id,
        gs.created_at,
        public.game_save_utm_source(gs.game_state) AS utm_source,
        public.game_save_utm_medium(gs.game_state) AS utm_medium,
        public.game_save_utm_campaign(gs.game_state) AS utm_campaign
      FROM game_saves gs
      WHERE gs.user_id IS NOT NULL
        AND (
          (gs.game_state -> 'utmAttribution') IS NOT NULL
          OR NULLIF(BTRIM(gs.game_state ->> 'googleAdsSource'), '') IS NOT NULL
        )
        AND public.game_save_has_utm_attribution(gs.game_state)
    ),
    attributed_in_range AS (
      SELECT *
      FROM attributed
      WHERE (created_at AT TIME ZONE 'UTC')::date >= v_from
    ),
    buyer_ids AS (
      SELECT DISTINCT p.user_id
      FROM purchases p
      INNER JOIN attributed a ON a.user_id = p.user_id
      WHERE p.price_paid > 0
        AND p.bundle_id IS NULL
    ),
    attributed_revenue AS (
      SELECT COALESCE(SUM(
        COALESCE(
          p.reporting_eur_cents::bigint,
          CASE
            WHEN LOWER(TRIM(p.currency)) = 'eur' THEN p.price_paid::bigint
            WHEN LOWER(TRIM(p.currency)) = 'usd' THEN (ROUND(p.price_paid::numeric / 1.09))::bigint
            ELSE p.price_paid::bigint
          END
        )
      ), 0)::bigint AS revenue_eur_cents
      FROM purchases p
      INNER JOIN attributed a ON a.user_id = p.user_id
      WHERE p.price_paid > 0
        AND p.bundle_id IS NULL
    ),
    top_source AS (
      SELECT utm_source AS label, COUNT(*)::bigint AS cnt
      FROM landings
      WHERE utm_source IS NOT NULL
      GROUP BY 1
      ORDER BY cnt DESC, label ASC
      LIMIT 1
    ),
    session_totals AS (
      SELECT
        COUNT(*)::bigint AS total_sessions,
        COUNT(u.session_id)::bigint AS sessions_with_utm
      FROM sessions s
      LEFT JOIN utm_landings u ON u.session_id = s.session_id
    )
    SELECT jsonb_build_object(
      'days_back', v_days,
      'total_sessions', (SELECT total_sessions FROM session_totals),
      'sessions_with_utm', (SELECT sessions_with_utm FROM session_totals),
      'sessions_without_utm', (
        SELECT GREATEST(total_sessions - sessions_with_utm, 0)
        FROM session_totals
      ),
      'total_landings', (SELECT COUNT(*)::bigint FROM landings),
      'distinct_sources', (
        SELECT COUNT(DISTINCT utm_source)::bigint
        FROM landings
        WHERE utm_source IS NOT NULL
      ),
      'distinct_campaigns', (
        SELECT COUNT(DISTINCT utm_campaign)::bigint
        FROM landings
        WHERE utm_campaign IS NOT NULL
      ),
      'top_source', COALESCE((SELECT label FROM top_source), NULL),
      'attributed_players', (SELECT COUNT(*)::bigint FROM attributed),
      'attributed_players_in_range', (SELECT COUNT(*)::bigint FROM attributed_in_range),
      'attributed_buyers', (SELECT COUNT(*)::bigint FROM buyer_ids),
      'attributed_revenue_eur_cents', (SELECT revenue_eur_cents FROM attributed_revenue),
      'daily_traffic', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'day', to_char(d.dt, 'YYYY-MM-DD'),
              'sessions', COALESCE(sv.cnt, 0),
              'landings', COALESCE(ul.cnt, 0),
              'without_utm', GREATEST(COALESCE(sv.cnt, 0) - COALESCE(ul.cnt, 0), 0)
            )
            ORDER BY d.dt ASC
          )
          FROM generate_series(v_from, v_today, '1 day'::interval) AS g(dt)
          CROSS JOIN LATERAL (SELECT g.dt::date AS dt) d
          LEFT JOIN (
            SELECT visit_date AS dt, COUNT(*)::bigint AS cnt
            FROM sessions
            GROUP BY 1
          ) sv ON sv.dt = d.dt
          LEFT JOIN (
            SELECT visit_date AS dt, COUNT(*)::bigint AS cnt
            FROM landings
            GROUP BY 1
          ) ul ON ul.dt = d.dt
        ),
        '[]'::jsonb
      ),
      'daily_landings', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'day', to_char(d.dt, 'YYYY-MM-DD'),
              'landings', COALESCE(c.cnt, 0)
            )
            ORDER BY d.dt ASC
          )
          FROM generate_series(v_from, v_today, '1 day'::interval) AS g(dt)
          CROSS JOIN LATERAL (SELECT g.dt::date AS dt) d
          LEFT JOIN (
            SELECT visit_date AS dt, COUNT(*)::bigint AS cnt
            FROM landings
            GROUP BY 1
          ) c ON c.dt = d.dt
        ),
        '[]'::jsonb
      ),
      'daily_attributed_saves', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'day', to_char(d.dt, 'YYYY-MM-DD'),
              'players', COALESCE(c.cnt, 0)
            )
            ORDER BY d.dt ASC
          )
          FROM generate_series(v_from, v_today, '1 day'::interval) AS g(dt)
          CROSS JOIN LATERAL (SELECT g.dt::date AS dt) d
          LEFT JOIN (
            SELECT (created_at AT TIME ZONE 'UTC')::date AS dt, COUNT(*)::bigint AS cnt
            FROM attributed_in_range
            GROUP BY 1
          ) c ON c.dt = d.dt
        ),
        '[]'::jsonb
      ),
      'by_source', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object('label', label, 'landings', cnt)
            ORDER BY cnt DESC, label ASC
          )
          FROM (
            SELECT COALESCE(utm_source, '(none)') AS label, COUNT(*)::bigint AS cnt
            FROM landings
            GROUP BY 1
            ORDER BY cnt DESC, label ASC
            LIMIT 20
          ) s
        ),
        '[]'::jsonb
      ),
      'by_medium', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object('label', label, 'landings', cnt)
            ORDER BY cnt DESC, label ASC
          )
          FROM (
            SELECT COALESCE(utm_medium, '(none)') AS label, COUNT(*)::bigint AS cnt
            FROM landings
            GROUP BY 1
            ORDER BY cnt DESC, label ASC
            LIMIT 20
          ) m
        ),
        '[]'::jsonb
      ),
      'by_campaign', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'label', c.label,
              'landings', c.landings,
              'attributed_players', COALESCE(a.players, 0),
              'buyers', COALESCE(b.buyers, 0)
            )
            ORDER BY c.landings DESC, c.label ASC
          )
          FROM (
            SELECT COALESCE(utm_campaign, '(none)') AS label, COUNT(*)::bigint AS landings
            FROM landings
            GROUP BY 1
            ORDER BY landings DESC, label ASC
            LIMIT 25
          ) c
          LEFT JOIN (
            SELECT COALESCE(utm_campaign, '(none)') AS label, COUNT(*)::bigint AS players
            FROM attributed
            GROUP BY 1
          ) a ON a.label = c.label
          LEFT JOIN (
            SELECT COALESCE(at.utm_campaign, '(none)') AS label, COUNT(DISTINCT p.user_id)::bigint AS buyers
            FROM purchases p
            INNER JOIN attributed at ON at.user_id = p.user_id
            WHERE p.price_paid > 0
              AND p.bundle_id IS NULL
            GROUP BY 1
          ) b ON b.label = c.label
        ),
        '[]'::jsonb
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_utm_dashboard(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_utm_dashboard(INTEGER) TO service_role;

COMMENT ON FUNCTION public.admin_utm_dashboard IS
  'Admin Traffic tab: session coverage + UTM landings + attributed save/purchase aggregates.';
