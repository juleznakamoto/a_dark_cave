
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
BEGIN
  -- Save or update the game state
  INSERT INTO game_saves (user_id, game_state, updated_at)
  VALUES (p_user_id, p_game_state, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    game_state = EXCLUDED.game_state,
    updated_at = EXCLUDED.updated_at;
  
  -- Save click analytics if provided
  IF p_click_analytics IS NOT NULL AND p_click_analytics != '{}'::jsonb THEN
    INSERT INTO button_clicks (user_id, timestamp, clicks)
    VALUES (p_user_id, NOW(), p_click_analytics);
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_game_with_analytics TO authenticated;
