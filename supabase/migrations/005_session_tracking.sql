-- Anonymous session duration tracking (GDPR compliant, no personal data)
-- Stores one row per browser tab session, updated every 5 minutes via client pings

CREATE TABLE IF NOT EXISTS session_visits (
  session_id TEXT PRIMARY KEY,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_visits_date ON session_visits(visit_date);

ALTER TABLE session_visits ENABLE ROW LEVEL SECURITY;

-- Upsert helper: preserves the original visit_date on conflict
CREATE OR REPLACE FUNCTION upsert_session_ping(p_session_id TEXT, p_duration INTEGER)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO session_visits (session_id, visit_date, duration_seconds, updated_at)
  VALUES (p_session_id, CURRENT_DATE, p_duration, NOW())
  ON CONFLICT (session_id)
  DO UPDATE SET duration_seconds = EXCLUDED.duration_seconds, updated_at = NOW();
$$;

-- Aggregate helper: returns daily session counts in exclusive duration buckets
CREATE OR REPLACE FUNCTION get_session_duration_stats(days_back INTEGER DEFAULT 90)
RETURNS TABLE (
  visit_date DATE,
  total      BIGINT,
  b_0_15m    BIGINT,
  b_15_30m   BIGINT,
  b_30m_1h   BIGINT,
  b_1h_2h    BIGINT,
  b_2h_3h    BIGINT,
  b_3h_4h    BIGINT,
  b_4h_plus  BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    sv.visit_date,
    COUNT(*)                                                                    AS total,
    COUNT(*) FILTER (WHERE duration_seconds < 900)                              AS b_0_15m,
    COUNT(*) FILTER (WHERE duration_seconds >= 900  AND duration_seconds < 1800) AS b_15_30m,
    COUNT(*) FILTER (WHERE duration_seconds >= 1800 AND duration_seconds < 3600) AS b_30m_1h,
    COUNT(*) FILTER (WHERE duration_seconds >= 3600 AND duration_seconds < 7200) AS b_1h_2h,
    COUNT(*) FILTER (WHERE duration_seconds >= 7200 AND duration_seconds < 10800) AS b_2h_3h,
    COUNT(*) FILTER (WHERE duration_seconds >= 10800 AND duration_seconds < 14400) AS b_3h_4h,
    COUNT(*) FILTER (WHERE duration_seconds >= 14400)                           AS b_4h_plus
  FROM session_visits sv
  WHERE sv.visit_date >= CURRENT_DATE - days_back
  GROUP BY sv.visit_date
  ORDER BY sv.visit_date;
$$;

-- Cleanup: remove sessions older than 1 year (run weekly)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM session_visits WHERE visit_date < CURRENT_DATE - 365;
END;
$$;

SELECT cron.unschedule('cleanup-old-sessions') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-sessions'
);

SELECT cron.schedule(
  'cleanup-old-sessions',
  '0 3 * * 0',
  'SELECT cleanup_old_sessions();'
);

COMMENT ON TABLE session_visits IS 'Anonymous session duration tracking - no personal data, GDPR compliant (service key access only)';
