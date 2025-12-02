-- Drop the existing function first to allow parameter name change
DROP FUNCTION IF EXISTS save_game_with_analytics(UUID, JSONB, JSONB);

-- Add resources column to button_clicks if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'button_clicks' AND column_name = 'resources'
  ) THEN
    ALTER TABLE button_clicks ADD COLUMN resources JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create purchases table to track user purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price_paid INTEGER NOT NULL,
  bundle_id TEXT, -- If this item was purchased as part of a bundle, stores the bundle item_id
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing policies if they exist (after tables are created)
DROP POLICY IF EXISTS "Users can view their own click data" ON button_clicks;
DROP POLICY IF EXISTS "Users can insert their own click data" ON button_clicks;
DROP POLICY IF EXISTS "Users can update their own click data" ON button_clicks;
DROP POLICY IF EXISTS "Users can view their own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON purchases;

-- Enable Row Level Security
ALTER TABLE button_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for button_clicks
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

-- Create policies for purchases
CREATE POLICY "Users can view their own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
  ON purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS button_clicks_user_id_idx ON button_clicks(user_id);
CREATE INDEX IF NOT EXISTS button_clicks_timestamp_idx ON button_clicks(timestamp);
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_item_id_idx ON purchases(item_id);

-- Create a function that saves both game state and click analytics atomically
-- Now handles state diffs by merging with existing state
-- Implements Optimistic Concurrency Control (OCC) based on playTime
-- Expects p_click_analytics and p_resource_analytics as raw data (not pre-bucketed)
CREATE OR REPLACE FUNCTION save_game_with_analytics(
  p_user_id UUID,
  p_game_state_diff JSONB,
  p_click_analytics JSONB DEFAULT NULL,
  p_resource_analytics JSONB DEFAULT NULL,
  p_clear_clicks BOOLEAN DEFAULT FALSE,
  p_allow_playtime_overwrite BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_state JSONB;
  v_merged_state JSONB;
  v_existing_clicks JSONB;
  v_existing_resources JSONB;
  v_updated_clicks JSONB;
  v_updated_resources JSONB;
  v_playtime_ms NUMERIC;
  v_playtime_minutes INTEGER;
  v_playtime_bucket INTEGER;
  v_playtime_key TEXT;
  v_existing_playtime NUMERIC;
  v_new_playtime NUMERIC;
BEGIN
  -- Get existing game state
  SELECT game_state INTO v_existing_state
  FROM game_saves
  WHERE user_id = p_user_id;

  -- OCC: Validate playTime if both states exist (unless overwrite is allowed)
  IF v_existing_state IS NOT NULL AND p_game_state_diff ? 'playTime' THEN
    v_existing_playtime := COALESCE((v_existing_state->>'playTime')::NUMERIC, 0);
    v_new_playtime := COALESCE((p_game_state_diff->>'playTime')::NUMERIC, 0);

    IF p_allow_playtime_overwrite THEN
      -- Allow overwrite for game restarts
      RAISE NOTICE 'OCC check SKIPPED: playTime overwrite allowed (game restart) - new: %, existing: %', 
        v_new_playtime, v_existing_playtime;
    ELSE
      -- Reject save if new playTime is not strictly greater than existing
      IF v_new_playtime <= v_existing_playtime THEN
        RAISE EXCEPTION 'OCC violation: new playTime (%) must be greater than existing playTime (%)', 
          v_new_playtime, v_existing_playtime;
      END IF;

      -- Log successful OCC check (visible in Supabase logs)
      RAISE NOTICE 'OCC check passed: new playTime (%) > existing playTime (%)', 
        v_new_playtime, v_existing_playtime;
    END IF;
  END IF;

  -- Merge the diff with existing state (deep merge for JSONB)
  IF v_existing_state IS NOT NULL THEN
    v_merged_state := v_existing_state || p_game_state_diff;
  ELSE
    v_merged_state := p_game_state_diff;
  END IF;

  -- Save or update the game state with merged data
  INSERT INTO game_saves (user_id, game_state, updated_at)
  VALUES (p_user_id, v_merged_state, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    game_state = EXCLUDED.game_state,
    updated_at = EXCLUDED.updated_at;

  -- Handle click and resource analytics
  IF p_clear_clicks THEN
    DELETE FROM button_clicks WHERE user_id = p_user_id;
  ELSE
    -- Get playtime bucket (10 minute intervals)
    v_playtime_ms := (v_merged_state->>'playTime')::NUMERIC;
    v_playtime_minutes := FLOOR(v_playtime_ms / 1000 / 60);
    v_playtime_bucket := FLOOR(v_playtime_minutes / 10) * 10;
    v_playtime_key := v_playtime_bucket || 'm';

    -- Get existing analytics
    SELECT clicks, resources INTO v_existing_clicks, v_existing_resources
    FROM button_clicks
    WHERE user_id = p_user_id;

    -- Process click analytics (cumulative)
    IF p_click_analytics IS NOT NULL AND p_click_analytics != '{}'::jsonb THEN
      IF v_existing_clicks IS NOT NULL THEN
        IF v_existing_clicks ? v_playtime_key THEN
          DECLARE
            v_existing_bucket JSONB;
            v_merged_bucket JSONB;
            v_key TEXT;
            v_existing_count INTEGER;
            v_new_count INTEGER;
          BEGIN
            v_existing_bucket := v_existing_clicks->v_playtime_key;
            v_merged_bucket := '{}'::jsonb;

            FOR v_key IN SELECT jsonb_object_keys(v_existing_bucket) LOOP
              v_existing_count := (v_existing_bucket->>v_key)::INTEGER;
              v_new_count := COALESCE((p_click_analytics->>v_key)::INTEGER, 0);
              v_merged_bucket := jsonb_set(v_merged_bucket, ARRAY[v_key], to_jsonb(v_existing_count + v_new_count));
            END LOOP;

            FOR v_key IN SELECT jsonb_object_keys(p_click_analytics) LOOP
              IF NOT (v_existing_bucket ? v_key) THEN
                v_merged_bucket := jsonb_set(v_merged_bucket, ARRAY[v_key], p_click_analytics->v_key);
              END IF;
            END LOOP;

            v_updated_clicks := jsonb_set(v_existing_clicks, ARRAY[v_playtime_key], v_merged_bucket);
          END;
        ELSE
          v_updated_clicks := v_existing_clicks || jsonb_build_object(v_playtime_key, p_click_analytics);
        END IF;
      ELSE
        v_updated_clicks := jsonb_build_object(v_playtime_key, p_click_analytics);
      END IF;
    ELSE
      v_updated_clicks := v_existing_clicks;
    END IF;

    -- Process resource analytics (SNAPSHOT VALUES - raw data from client)
    IF p_resource_analytics IS NOT NULL AND p_resource_analytics != '{}'::jsonb THEN
      IF v_existing_resources IS NOT NULL THEN
        -- Store the snapshot in the current playtime bucket
        IF v_existing_resources ? v_playtime_key THEN
          -- Replace the snapshot at this bucket (snapshots are not cumulative)
          v_updated_resources := jsonb_set(v_existing_resources, ARRAY[v_playtime_key], p_resource_analytics);
        ELSE
          -- Add new bucket
          v_updated_resources := v_existing_resources || jsonb_build_object(v_playtime_key, p_resource_analytics);
        END IF;
      ELSE
        -- First snapshot
        v_updated_resources := jsonb_build_object(v_playtime_key, p_resource_analytics);
      END IF;
    ELSE
      v_updated_resources := v_existing_resources;
    END IF;

    -- Upsert the analytics
    IF v_updated_clicks IS NOT NULL OR v_updated_resources IS NOT NULL THEN
      INSERT INTO button_clicks (user_id, timestamp, clicks, resources)
      VALUES (
        p_user_id, 
        NOW(), 
        COALESCE(v_updated_clicks, '{}'::jsonb),
        COALESCE(v_updated_resources, '{}'::jsonb)
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        clicks = EXCLUDED.clicks,
        resources = EXCLUDED.resources,
        timestamp = EXCLUDED.timestamp;
    END IF;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_game_with_analytics(UUID, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN) TO authenticated;