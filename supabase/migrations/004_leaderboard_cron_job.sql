
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing leaderboard refresh function if it exists
DROP FUNCTION IF EXISTS refresh_leaderboard();

-- Create a function that rebuilds the leaderboard from game_stats
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear existing leaderboard entries
  TRUNCATE TABLE leaderboard;
  
  -- Insert new entries from game_stats (best time per user per mode)
  INSERT INTO leaderboard (user_id, username, email, play_time, cruel_mode, completed_at)
  SELECT DISTINCT ON (gs.user_id, (completion->>'gameMode')::text)
    gs.user_id,
    gs.username,
    au.email,
    (completion->>'playTime')::bigint as play_time,
    CASE 
      WHEN (completion->>'gameMode')::text = 'cruel' THEN true
      ELSE false
    END as cruel_mode,
    to_timestamp((completion->>'finishTime')::bigint / 1000.0) as completed_at
  FROM game_saves gs
  JOIN auth.users au ON gs.user_id = au.id
  CROSS JOIN LATERAL jsonb_array_elements(gs.game_stats) AS completion
  WHERE 
    gs.game_stats IS NOT NULL 
    AND jsonb_array_length(gs.game_stats) > 0
    AND (completion->>'playTime') IS NOT NULL
    AND (completion->>'finishTime') IS NOT NULL
  ORDER BY gs.user_id, (completion->>'gameMode')::text, (completion->>'playTime')::bigint ASC
  ON CONFLICT (user_id, cruel_mode) 
  DO UPDATE SET
    play_time = EXCLUDED.play_time,
    username = EXCLUDED.username,
    completed_at = EXCLUDED.completed_at
  WHERE EXCLUDED.play_time < leaderboard.play_time;
  
  -- Update the last_updated timestamp
  INSERT INTO leaderboard_metadata (key, value)
  VALUES ('last_updated', NOW()::text)
  ON CONFLICT (key) DO UPDATE SET value = NOW()::text;
END;
$$;

-- Create metadata table to track last update time (if not exists)
CREATE TABLE IF NOT EXISTS leaderboard_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate entries per user per mode (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_mode'
  ) THEN
    ALTER TABLE leaderboard ADD CONSTRAINT unique_user_mode UNIQUE (user_id, cruel_mode);
  END IF;
END $$;

-- Schedule the job to run daily at 3 AM UTC
SELECT cron.schedule(
  'refresh-leaderboard-daily',
  '0 3 * * *',
  'SELECT refresh_leaderboard();'
);
