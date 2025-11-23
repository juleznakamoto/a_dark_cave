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

    -- Get playtime from game state (in milliseconds, convert to minutes)
    DECLARE
      v_playtime_ms NUMERIC;
      v_playtime_minutes INTEGER;
      v_playtime_key TEXT;
    BEGIN
      v_playtime_ms := (p_game_state->>'playTime')::NUMERIC;
      v_playtime_minutes := FLOOR(v_playtime_ms / 1000 / 60);
      v_playtime_key := v_playtime_minutes || 'm';
    END;

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
GRANT EXECUTE ON FUNCTION save_game_with_analytics TO authenticated;