
-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users can view their own click data" ON button_clicks;
DROP POLICY IF EXISTS "Users can insert their own click data" ON button_clicks;
DROP POLICY IF EXISTS "Users can update their own click data" ON button_clicks;
DROP POLICY IF EXISTS "Users can view their own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON purchases;

-- Create the button_clicks table for analytics (one row per user)
CREATE TABLE IF NOT EXISTS button_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  clicks JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE button_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own click data"
  ON button_clicks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own click data"
  ON button_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own click data"
  ON button_clicks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS button_clicks_user_id_idx ON button_clicks(user_id);
CREATE INDEX IF NOT EXISTS button_clicks_timestamp_idx ON button_clicks(timestamp);

-- Create purchases table to track user purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price_paid INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_item_id_idx ON purchases(item_id);

-- Enable RLS (Row Level Security)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own purchases
CREATE POLICY "Users can view their own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own purchases
CREATE POLICY "Users can insert their own purchases"
  ON purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a function that saves both game state and click analytics atomically
CREATE OR REPLACE FUNCTION save_game_with_analytics(
  p_user_id UUID,
  p_game_state JSONB,
  p_click_analytics JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_clicks JSONB;
  v_updated_clicks JSONB;
  v_playtime_ms NUMERIC;
  v_playtime_minutes INTEGER;
  v_playtime_bucket INTEGER;
  v_playtime_key TEXT;
BEGIN
  -- Save or update the game state
  INSERT INTO game_saves (user_id, game_state, updated_at)
  VALUES (p_user_id, p_game_state, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    game_state = EXCLUDED.game_state,
    updated_at = EXCLUDED.updated_at;

  -- Handle click analytics
  IF p_click_analytics IS NULL THEN
    -- Delete existing clicks when starting a new game
    DELETE FROM button_clicks WHERE user_id = p_user_id;
  ELSIF p_click_analytics != '{}'::jsonb THEN
    -- Get existing clicks for this user
    SELECT clicks INTO v_existing_clicks
    FROM button_clicks
    WHERE user_id = p_user_id;

    -- Get playtime from game state (in milliseconds, convert to 5-minute buckets)
    v_playtime_ms := (p_game_state->>'playTime')::NUMERIC;
    v_playtime_minutes := FLOOR(v_playtime_ms / 1000 / 60 / 60);
    -- Round down to nearest 5-minute bucket
    v_playtime_bucket := FLOOR(v_playtime_minutes / 5) * 5;
    v_playtime_key := v_playtime_bucket || 'm';

    -- If user has existing clicks, append new playtime entry
    IF v_existing_clicks IS NOT NULL THEN
      -- Add new playtime with clicks to existing data
      v_updated_clicks := v_existing_clicks || jsonb_build_object(v_playtime_key, p_click_analytics);
    ELSE
      -- No existing clicks, create new object with playtime
      v_updated_clicks := jsonb_build_object(v_playtime_key, p_click_analytics);
    END IF;

    -- Upsert the clicks with timestamp
    INSERT INTO button_clicks (user_id, timestamp, clicks)
    VALUES (p_user_id, NOW(), v_updated_clicks)
    ON CONFLICT (user_id)
    DO UPDATE SET
      clicks = EXCLUDED.clicks,
      timestamp = EXCLUDED.timestamp;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_game_with_analytics(UUID, JSONB, JSONB) TO authenticated;
