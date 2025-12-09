
-- Add username column to game_saves table
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE game_saves_dev ADD COLUMN IF NOT EXISTS username TEXT;

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

-- Policies for leaderboard
CREATE POLICY "Anyone can view leaderboard" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Users can insert their own entries" ON leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own entries" ON leaderboard FOR UPDATE USING (auth.uid() = user_id);
