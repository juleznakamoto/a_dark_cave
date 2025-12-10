
-- Add username column to game_saves table
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS username TEXT;

-- Add game_stats column to track multiple game completions
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS game_stats JSONB DEFAULT '[]'::jsonb;

-- Add index for faster querying of game completions
CREATE INDEX IF NOT EXISTS idx_game_stats_completions ON game_saves USING gin (game_stats);

-- Add comment explaining the structure
COMMENT ON COLUMN game_saves.game_stats IS 'Array of game completion records: [{gameId: string, gameMode: "normal"|"cruel", startTime: timestamp, finishTime: timestamp, playTime: number}]';

-- Create leaderboard table for tracking completion times
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  play_time BIGINT NOT NULL,
  cruel_mode BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_normal ON leaderboard (cruel_mode, play_time) WHERE cruel_mode = false;
CREATE INDEX IF NOT EXISTS idx_leaderboard_cruel ON leaderboard (cruel_mode, play_time) WHERE cruel_mode = true;
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard (user_id);

-- Enable RLS
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Users can insert their own entries" ON leaderboard;
DROP POLICY IF EXISTS "Users can update their own entries" ON leaderboard;

-- Policies for leaderboard
CREATE POLICY "Anyone can view leaderboard" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Users can insert their own entries" ON leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own entries" ON leaderboard FOR UPDATE USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate entries per user per mode
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_mode'
  ) THEN
    ALTER TABLE leaderboard ADD CONSTRAINT unique_user_mode UNIQUE (user_id, cruel_mode);
  END IF;
END $$;

-- Create metadata table to track last update time
CREATE TABLE IF NOT EXISTS leaderboard_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Schedule the job to run daily at 3 AM UTC
SELECT cron.schedule(
  'refresh-leaderboard-daily',
  '0 3 * * *',
  'SELECT refresh_leaderboard();'
);
