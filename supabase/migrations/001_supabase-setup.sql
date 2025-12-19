
-- Create the game_saves table
CREATE TABLE IF NOT EXISTS game_saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_state JSONB NOT NULL,
  game_stats JSONB DEFAULT '[]'::jsonb,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create button_clicks table for analytics
CREATE TABLE IF NOT EXISTS button_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clicks JSONB DEFAULT '{}'::jsonb,
  resources JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id)
);

-- Create purchases table to track user purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price_paid INTEGER NOT NULL,
  bundle_id TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE button_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own saves" ON game_saves;
DROP POLICY IF EXISTS "Users can insert their own saves" ON game_saves;
DROP POLICY IF EXISTS "Users can update their own saves" ON game_saves;
DROP POLICY IF EXISTS "Users can delete their own saves" ON game_saves;

DROP POLICY IF EXISTS "Users can view their own click data" ON button_clicks;
DROP POLICY IF EXISTS "Users can insert their own click data" ON button_clicks;
DROP POLICY IF EXISTS "Users can update their own click data" ON button_clicks;

DROP POLICY IF EXISTS "Users can view their own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON purchases;

-- RLS policies for game_saves (optimized with subquery pattern)
CREATE POLICY "Users can view their own saves"
  ON game_saves FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own saves"
  ON game_saves FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own saves"
  ON game_saves FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own saves"
  ON game_saves FOR DELETE
  USING ((select auth.uid()) = user_id);

-- RLS policies for button_clicks (optimized with subquery pattern)
CREATE POLICY "Users can view their own click data" ON button_clicks
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own click data" ON button_clicks
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own click data" ON button_clicks
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- RLS policies for purchases (optimized with subquery pattern)
CREATE POLICY "Users can view their own purchases" ON purchases
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own purchases" ON purchases
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS game_saves_user_id_idx ON game_saves(user_id);
CREATE INDEX IF NOT EXISTS button_clicks_user_id_idx ON button_clicks(user_id);
CREATE INDEX IF NOT EXISTS button_clicks_timestamp_idx ON button_clicks(timestamp);
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_item_id_idx ON purchases(item_id);

-- Create a function that saves both game state and click analytics atomically
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
      RAISE NOTICE 'OCC check SKIPPED: playTime overwrite allowed (game restart) - new: %, existing: %', 
        v_new_playtime, v_existing_playtime;
    ELSE
      IF v_new_playtime <= v_existing_playtime THEN
        RAISE EXCEPTION 'OCC violation: new playTime (%) must be greater than existing playTime (%)', 
          v_new_playtime, v_existing_playtime;
      END IF;

      RAISE NOTICE 'OCC check passed: new playTime (%) > existing playTime (%)', 
        v_new_playtime, v_existing_playtime;
    END IF;
  END IF;

  -- Merge the diff with existing state
  IF v_existing_state IS NOT NULL THEN
    v_merged_state := v_existing_state || p_game_state_diff;
  ELSE
    v_merged_state := p_game_state_diff;
  END IF;

  -- Check if game was just completed
  DECLARE
    v_game_completed BOOLEAN := FALSE;
    v_existing_game_stats JSONB;
    v_new_game_stats JSONB;
    v_completion_record JSONB;
    v_game_mode TEXT;
    v_start_time BIGINT;
    v_finish_time BIGINT;
    v_playtime_ms BIGINT;
    v_game_id TEXT;
    v_already_recorded BOOLEAN := FALSE;
  BEGIN
    IF v_merged_state ? 'events' THEN
      v_game_completed := (
        (v_merged_state->'events'->>'cube13')::boolean = true OR
        (v_merged_state->'events'->>'cube14a')::boolean = true OR
        (v_merged_state->'events'->>'cube14b')::boolean = true OR
        (v_merged_state->'events'->>'cube14c')::boolean = true OR
        (v_merged_state->'events'->>'cube14d')::boolean = true OR
        (v_merged_state->'events'->>'cube15a')::boolean = true OR
        (v_merged_state->'events'->>'cube15b')::boolean = true
      );
    END IF;

    IF v_game_completed AND v_merged_state ? 'playTime' AND v_merged_state ? 'startTime' AND v_merged_state ? 'gameId' THEN
      v_game_id := v_merged_state->>'gameId';

      SELECT game_stats INTO v_existing_game_stats
      FROM game_saves
      WHERE user_id = p_user_id;

      IF v_existing_game_stats IS NULL THEN
        v_existing_game_stats := '[]'::jsonb;
      END IF;

      IF v_game_id IS NULL THEN
        SELECT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_existing_game_stats) AS elem
          WHERE (elem->>'gameId') IS NULL
        ) INTO v_already_recorded;
      ELSE
        SELECT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_existing_game_stats) AS elem
          WHERE elem->>'gameId' = v_game_id
        ) INTO v_already_recorded;
      END IF;

      IF NOT v_already_recorded THEN
        v_game_mode := CASE 
          WHEN (v_merged_state->>'cruelMode')::boolean = true THEN 'cruel'
          ELSE 'normal'
        END;

        v_start_time := (v_merged_state->>'startTime')::bigint;
        v_finish_time := EXTRACT(EPOCH FROM NOW())::bigint * 1000;
        v_playtime_ms := (v_merged_state->>'playTime')::bigint;

        v_completion_record := jsonb_build_object(
          'gameId', v_game_id,
          'gameMode', v_game_mode,
          'startTime', v_start_time,
          'finishTime', v_finish_time,
          'playTime', v_playtime_ms
        );

        v_new_game_stats := v_existing_game_stats || jsonb_build_array(v_completion_record);

        INSERT INTO game_saves (user_id, game_state, game_stats, updated_at)
        VALUES (p_user_id, v_merged_state, v_new_game_stats, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          game_state = EXCLUDED.game_state,
          game_stats = EXCLUDED.game_stats,
          updated_at = EXCLUDED.updated_at;

        RAISE NOTICE 'Game completion recorded for gameId: %', v_game_id;
      ELSE
        INSERT INTO game_saves (user_id, game_state, updated_at)
        VALUES (p_user_id, v_merged_state, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          game_state = EXCLUDED.game_state,
          updated_at = EXCLUDED.updated_at;

        RAISE NOTICE 'Game completion already recorded for gameId: %', v_game_id;
      END IF;
    ELSE
      INSERT INTO game_saves (user_id, game_state, updated_at)
      VALUES (p_user_id, v_merged_state, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        game_state = EXCLUDED.game_state,
        updated_at = EXCLUDED.updated_at;
    END IF;
  END;

  -- Handle click and resource analytics
  IF p_clear_clicks THEN
    DELETE FROM button_clicks WHERE user_id = p_user_id;
  ELSE
    v_playtime_ms := (v_merged_state->>'playTime')::NUMERIC;
    v_playtime_minutes := FLOOR(v_playtime_ms / 1000 / 60);
    v_playtime_bucket := FLOOR(v_playtime_minutes / 10) * 10;
    v_playtime_key := v_playtime_bucket || 'm';

    SELECT clicks, resources INTO v_existing_clicks, v_existing_resources
    FROM button_clicks
    WHERE user_id = p_user_id;

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

            -- First, add all existing keys with their merged counts
            FOR v_key IN SELECT jsonb_object_keys(v_existing_bucket) LOOP
              v_existing_count := (v_existing_bucket->>v_key)::INTEGER;
              v_new_count := COALESCE((p_click_analytics->>v_key)::INTEGER, 0);
              v_merged_bucket := jsonb_set(v_merged_bucket, ARRAY[v_key], to_jsonb(v_existing_count + v_new_count));
            END LOOP;

            -- Then, add any new keys that weren't in the existing bucket
            FOR v_key IN SELECT jsonb_object_keys(p_click_analytics) LOOP
              IF NOT (v_existing_bucket ? v_key) THEN
                v_new_count := (p_click_analytics->>v_key)::INTEGER;
                v_merged_bucket := jsonb_set(v_merged_bucket, ARRAY[v_key], to_jsonb(v_new_count));
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

    IF p_resource_analytics IS NOT NULL AND p_resource_analytics != '{}'::jsonb THEN
      IF v_existing_resources IS NOT NULL THEN
        IF v_existing_resources ? v_playtime_key THEN
          v_updated_resources := jsonb_set(v_existing_resources, ARRAY[v_playtime_key], p_resource_analytics);
        ELSE
          v_updated_resources := v_existing_resources || jsonb_build_object(v_playtime_key, p_resource_analytics);
        END IF;
      ELSE
        v_updated_resources := jsonb_build_object(v_playtime_key, p_resource_analytics);
      END IF;
    ELSE
      v_updated_resources := v_existing_resources;
    END IF;

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

GRANT EXECUTE ON FUNCTION save_game_with_analytics(UUID, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN) TO authenticated;
