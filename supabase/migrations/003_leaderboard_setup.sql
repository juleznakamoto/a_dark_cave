
-- Create the game_saves_dev table (mirror of game_saves for development)
CREATE TABLE IF NOT EXISTS game_saves_dev (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE game_saves_dev ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saves"
  ON game_saves_dev FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saves"
  ON game_saves_dev FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saves"
  ON game_saves_dev FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saves"
  ON game_saves_dev FOR DELETE
  USING (auth.uid() = user_id);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS game_saves_dev_user_id_idx ON game_saves_dev(user_id);

-- Add username column to game_saves tables
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
