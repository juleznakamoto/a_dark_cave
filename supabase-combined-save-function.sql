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
  v_current_timestamp TEXT;
BEGIN
  -- Save or update the game state
  INSERT INTO game_saves (user_id, game_state, updated_at)
  VALUES (p_user_id, p_game_state, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    game_state = EXCLUDED.game_state,
    updated_at = EXCLUDED.updated_at;

  -- Save/update click analytics if provided (append with timestamp)
  IF p_click_analytics IS NOT NULL AND p_click_analytics != '{}'::jsonb THEN
    -- Get existing clicks for this user
    SELECT clicks INTO v_existing_clicks
    FROM button_clicks
    WHERE user_id = p_user_id;

    -- Create timestamp key (ISO 8601 format)
    v_current_timestamp := to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

    -- If user has existing clicks, append new timestamp
    IF v_existing_clicks IS NOT NULL THEN
      -- Add new timestamp with clicks to existing data
      v_updated_clicks := v_existing_clicks || jsonb_build_object(v_current_timestamp, p_click_analytics);
    ELSE
      -- No existing clicks, create new object with timestamp
      v_updated_clicks := jsonb_build_object(v_current_timestamp, p_click_analytics);
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