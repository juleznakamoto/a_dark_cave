-- Intra-day session volume for admin dashboard.
-- Session start is estimated as updated_at - duration_seconds (no created_at on session_visits).

CREATE OR REPLACE FUNCTION get_session_intraday_stats(
  p_hours_back INTEGER DEFAULT 24,
  p_step_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  bucket_start TIMESTAMPTZ,
  session_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      GREATEST(1, LEAST(COALESCE(p_hours_back, 24), 48)) AS hours_back,
      GREATEST(1, LEAST(COALESCE(p_step_minutes, 60), 120)) AS step_minutes
  ),
  window_bounds AS (
    SELECT
      date_bin(
        (p.step_minutes::text || ' minutes')::interval,
        NOW(),
        TIMESTAMPTZ '2000-01-01'
      ) AS end_bucket,
      p.hours_back,
      p.step_minutes,
      (p.step_minutes::text || ' minutes')::interval AS step_interval,
      (p.hours_back::text || ' hours')::interval AS lookback
    FROM params p
  ),
  buckets AS (
    SELECT gs AS bucket_start
    FROM window_bounds w,
    LATERAL generate_series(
      w.end_bucket - w.lookback,
      w.end_bucket,
      w.step_interval
    ) AS gs
  ),
  sessions AS (
    SELECT date_bin(
      w.step_interval,
      sv.updated_at - (sv.duration_seconds * INTERVAL '1 second'),
      TIMESTAMPTZ '2000-01-01'
    ) AS bucket_start
    FROM session_visits sv
    CROSS JOIN window_bounds w
    WHERE sv.updated_at >= w.end_bucket - w.lookback - INTERVAL '1 day'
      AND sv.updated_at - (sv.duration_seconds * INTERVAL '1 second')
            >= w.end_bucket - w.lookback
      AND sv.updated_at - (sv.duration_seconds * INTERVAL '1 second') < NOW()
  )
  SELECT
    b.bucket_start,
    COUNT(s.bucket_start)::bigint AS session_count
  FROM buckets b
  LEFT JOIN sessions s ON s.bucket_start = b.bucket_start
  GROUP BY b.bucket_start
  ORDER BY b.bucket_start;
$$;

COMMENT ON FUNCTION get_session_intraday_stats(INTEGER, INTEGER) IS
  'Admin intra-day session counts; start ≈ updated_at - duration_seconds';
