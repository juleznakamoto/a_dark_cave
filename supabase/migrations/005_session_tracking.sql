-- Anonymous session duration tracking (GDPR compliant, no personal data)
-- Stores one row per browser tab session with its duration

CREATE TABLE IF NOT EXISTS session_visits (
  session_id TEXT PRIMARY KEY,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_visits_date ON session_visits(visit_date);

ALTER TABLE session_visits ENABLE ROW LEVEL SECURITY;

-- Aggregate helper: returns daily session duration buckets
CREATE OR REPLACE FUNCTION get_session_duration_stats(days_back INTEGER DEFAULT 90)
RETURNS TABLE (
  visit_date DATE,
  total_sessions BIGINT,
  lt_15m BIGINT,
  gte_15m BIGINT,
  lt_30m BIGINT,
  lt_1h BIGINT,
  lt_2h BIGINT,
  lt_3h BIGINT,
  lt_4h BIGINT,
  gte_4h BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    sv.visit_date,
    COUNT(*)                                           AS total_sessions,
    COUNT(*) FILTER (WHERE duration_seconds < 900)     AS lt_15m,
    COUNT(*) FILTER (WHERE duration_seconds >= 900)    AS gte_15m,
    COUNT(*) FILTER (WHERE duration_seconds < 1800)    AS lt_30m,
    COUNT(*) FILTER (WHERE duration_seconds < 3600)    AS lt_1h,
    COUNT(*) FILTER (WHERE duration_seconds < 7200)    AS lt_2h,
    COUNT(*) FILTER (WHERE duration_seconds < 10800)   AS lt_3h,
    COUNT(*) FILTER (WHERE duration_seconds < 14400)   AS lt_4h,
    COUNT(*) FILTER (WHERE duration_seconds >= 14400)  AS gte_4h
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

-- Upsert that preserves the original visit_date on conflict
-- (prevents midnight-crossing sessions from overwriting the earlier day's record)
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

COMMENT ON TABLE session_visits IS 'Anonymous session duration tracking - no personal data, GDPR compliant (service key access only)';
