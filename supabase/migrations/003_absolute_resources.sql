
-- Update button_clicks table to store absolute resources instead of changes
-- Rename resource_changes to resources for clarity
ALTER TABLE button_clicks RENAME COLUMN resource_changes TO resources;

-- Update the save_game_with_analytics function to handle absolute resources
DROP FUNCTION IF EXISTS save_game_with_analytics(UUID, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN);

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

  -- Save or update the game state
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
    -- Get playtime bucket (1 hour = 60 minutes)
    v_playtime_ms := (v_merged_state->>'playTime')::NUMERIC;
    v_playtime_minutes := FLOOR(v_playtime_ms / 1000 / 60);
    v_playtime_bucket := FLOOR(v_playtime_minutes / 60) * 60;
    v_playtime_key := v_playtime_bucket || 'm';

    -- Get existing analytics
    SELECT clicks, resources INTO v_existing_clicks, v_existing_resources
    FROM button_clicks
    WHERE user_id = p_user_id;

    -- Process click analytics (same as before - cumulative)
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

    -- Process resource analytics (ABSOLUTE VALUES - just replace, don't sum)
    IF p_resource_analytics IS NOT NULL AND p_resource_analytics != '{}'::jsonb THEN
      IF v_existing_resources IS NOT NULL THEN
        -- Simply replace the bucket with new absolute values
        v_updated_resources := jsonb_set(v_existing_resources, ARRAY[v_playtime_key], p_resource_analytics);
      ELSE
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

GRANT EXECUTE ON FUNCTION save_game_with_analytics(UUID, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN) TO authenticated;
