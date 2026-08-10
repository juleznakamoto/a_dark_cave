-- Anonymous UTM landing traffic + admin dashboard aggregates.
-- No PII: random session_id + campaign query params only (service key access).

CREATE TABLE IF NOT EXISTS public.utm_landings (
  session_id TEXT PRIMARY KEY,
  visit_date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utm_landings_visit_date
  ON public.utm_landings (visit_date);

CREATE INDEX IF NOT EXISTS idx_utm_landings_source
  ON public.utm_landings (utm_source);

CREATE INDEX IF NOT EXISTS idx_utm_landings_campaign
  ON public.utm_landings (utm_campaign);

ALTER TABLE public.utm_landings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.utm_landings IS
  'Anonymous UTM landing visits - no personal data, GDPR-oriented (service key access only)';

-- Insert-only upsert: first touch wins (refresh / duplicate beacon ignored).
CREATE OR REPLACE FUNCTION public.upsert_utm_landing(
  p_session_id TEXT,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.utm_landings (
    session_id,
    visit_date,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    created_at
  )
  VALUES (
    p_session_id,
    (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
    NULLIF(BTRIM(p_utm_source), ''),
    NULLIF(BTRIM(p_utm_medium), ''),
    NULLIF(BTRIM(p_utm_campaign), ''),
    NULLIF(BTRIM(p_utm_content), ''),
    NULLIF(BTRIM(p_utm_term), ''),
    NOW()
  )
  ON CONFLICT (session_id) DO NOTHING;
$$;

-- Supabase auto-grants EXECUTE to anon/authenticated on new functions; PUBLIC alone is not enough.
REVOKE ALL ON FUNCTION public.upsert_utm_landing(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_utm_landing(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

-- Extend session cleanup to also prune old UTM landings (same 365-day window).
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM session_visits WHERE visit_date < CURRENT_DATE - 365;
  DELETE FROM utm_landings WHERE visit_date < CURRENT_DATE - 365;
END;
$$;

-- Helpers for attributed saves (UTM object or legacy googleAdsSource).
CREATE OR REPLACE FUNCTION public.game_save_has_utm_attribution(gs jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    gs IS NOT NULL
    AND (
      (
        gs->'utmAttribution' IS NOT NULL
        AND jsonb_typeof(gs->'utmAttribution') = 'object'
        AND (
          NULLIF(BTRIM(gs->'utmAttribution'->>'source'), '') IS NOT NULL
          OR NULLIF(BTRIM(gs->'utmAttribution'->>'medium'), '') IS NOT NULL
          OR NULLIF(BTRIM(gs->'utmAttribution'->>'campaign'), '') IS NOT NULL
          OR NULLIF(BTRIM(gs->'utmAttribution'->>'content'), '') IS NOT NULL
          OR NULLIF(BTRIM(gs->'utmAttribution'->>'term'), '') IS NOT NULL
        )
      )
      OR NULLIF(BTRIM(gs->>'googleAdsSource'), '') IS NOT NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.game_save_utm_source(gs jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(BTRIM(gs->'utmAttribution'->>'source'), ''),
    CASE
      WHEN NULLIF(BTRIM(gs->>'googleAdsSource'), '') IS NOT NULL THEN 'google_ads'
      ELSE NULL
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.game_save_utm_medium(gs jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(BTRIM(gs->'utmAttribution'->>'medium'), '');
$$;

CREATE OR REPLACE FUNCTION public.game_save_utm_campaign(gs jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(BTRIM(gs->'utmAttribution'->>'campaign'), ''),
    NULLIF(BTRIM(gs->>'googleAdsSource'), '')
  );
$$;

-- Admin dashboard payload for the Traffic tab.
CREATE OR REPLACE FUNCTION public.admin_utm_dashboard(days_back INTEGER DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER := GREATEST(1, LEAST(COALESCE(days_back, 90), 800));
  v_from DATE := ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date) - v_days;
BEGIN
  RETURN (
    WITH landings AS (
      SELECT *
      FROM utm_landings
      WHERE visit_date >= v_from
    ),
    attributed AS (
      SELECT
        gs.user_id,
        gs.created_at,
        public.game_save_utm_source(gs.game_state) AS utm_source,
        public.game_save_utm_medium(gs.game_state) AS utm_medium,
        public.game_save_utm_campaign(gs.game_state) AS utm_campaign
      FROM game_saves gs
      WHERE gs.user_id IS NOT NULL
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
    )
    SELECT jsonb_build_object(
      'days_back', v_days,
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
      'daily_landings', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'day', to_char(d.dt, 'YYYY-MM-DD'),
              'landings', COALESCE(c.cnt, 0)
            )
            ORDER BY d.dt ASC
          )
          FROM generate_series(v_from, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, '1 day'::interval) AS g(dt)
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
          FROM generate_series(v_from, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, '1 day'::interval) AS g(dt)
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

-- Supabase auto-grants EXECUTE to anon/authenticated on new functions; PUBLIC alone is not enough.
REVOKE ALL ON FUNCTION public.admin_utm_dashboard(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_utm_dashboard(INTEGER) TO service_role;

COMMENT ON FUNCTION public.admin_utm_dashboard IS
  'Admin Traffic tab: UTM landings + attributed save/purchase aggregates.';
