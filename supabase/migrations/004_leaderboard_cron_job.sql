
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing leaderboard refresh function if it exists
DROP FUNCTION IF EXISTS refresh_leaderboard();

-- Create a function that rebuilds the leaderboard from game saves
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear existing leaderboard entries
  TRUNCATE TABLE leaderboard;
  
  -- Insert new entries from game_saves where game is completed
  -- This assumes completed games have a specific flag in game_state
  INSERT INTO leaderboard (user_id, username, email, play_time, cruel_mode, completed_at)
  SELECT 
    gs.user_id,
    gs.username,
    au.email,
    (gs.game_state->>'totalPlayTime')::bigint as play_time,
    COALESCE((gs.game_state->>'cruelMode')::boolean, false) as cruel_mode,
    gs.updated_at as completed_at
  FROM game_saves gs
  JOIN auth.users au ON gs.user_id = au.id
  WHERE 
    -- Only include completed games (adjust this condition based on your game_state structure)
    (gs.game_state->>'gameWon')::boolean = true
    AND (gs.game_state->>'totalPlayTime') IS NOT NULL
  ON CONFLICT (user_id, cruel_mode) 
  DO UPDATE SET
    play_time = EXCLUDED.play_time,
    username = EXCLUDED.username,
    completed_at = EXCLUDED.completed_at
  WHERE EXCLUDED.play_time < leaderboard.play_time;
  
  -- Update the last_updated timestamp
  -- You'll need to create this table if it doesn't exist
  INSERT INTO leaderboard_metadata (key, value)
  VALUES ('last_updated', NOW()::text)
  ON CONFLICT (key) DO UPDATE SET value = NOW()::text;
END;
$$;

-- Create metadata table to track last update time
CREATE TABLE IF NOT EXISTS leaderboard_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate entries per user per mode
ALTER TABLE leaderboard 
ADD CONSTRAINT unique_user_mode UNIQUE (user_id, cruel_mode);

-- Schedule the job to run daily at 3 AM UTC
SELECT cron.schedule(
  'refresh-leaderboard-daily',
  '0 3 * * *',
  'SELECT refresh_leaderboard();'
);
