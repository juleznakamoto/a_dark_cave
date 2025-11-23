
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
  v_merged_clicks JSONB;
  v_button TEXT;
  v_new_count INTEGER;
  v_existing_count INTEGER;
BEGIN
  -- Save or update the game state
  INSERT INTO game_saves (user_id, game_state, updated_at)
  VALUES (p_user_id, p_game_state, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    game_state = EXCLUDED.game_state,
    updated_at = EXCLUDED.updated_at;
  
  -- Save/update click analytics if provided (append to existing clicks)
  IF p_click_analytics IS NOT NULL AND p_click_analytics != '{}'::jsonb THEN
    -- Get existing clicks for this user
    SELECT clicks INTO v_existing_clicks
    FROM button_clicks
    WHERE user_id = p_user_id;
    
    -- If user has existing clicks, merge them
    IF v_existing_clicks IS NOT NULL THEN
      v_merged_clicks := v_existing_clicks;
      
      -- Loop through new clicks and add to existing
      FOR v_button IN SELECT jsonb_object_keys(p_click_analytics)
      LOOP
        v_new_count := (p_click_analytics->>v_button)::INTEGER;
        v_existing_count := COALESCE((v_existing_clicks->>v_button)::INTEGER, 0);
        v_merged_clicks := jsonb_set(
          v_merged_clicks,
          ARRAY[v_button],
          to_jsonb(v_existing_count + v_new_count)
        );
      END LOOP;
    ELSE
      -- No existing clicks, use new clicks as-is
      v_merged_clicks := p_click_analytics;
    END IF;
    
    -- Upsert the merged clicks
    INSERT INTO button_clicks (user_id, timestamp, clicks, updated_at)
    VALUES (p_user_id, NOW(), v_merged_clicks, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      clicks = EXCLUDED.clicks,
      timestamp = EXCLUDED.timestamp,
      updated_at = EXCLUDED.updated_at;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_game_with_analytics TO authenticated;
