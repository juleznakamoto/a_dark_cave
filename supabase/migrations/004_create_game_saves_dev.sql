
-- Create the game_saves_dev table (mirror of game_saves for development)
CREATE TABLE IF NOT EXISTS game_saves_dev (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_state JSONB NOT NULL,
  username TEXT,
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
