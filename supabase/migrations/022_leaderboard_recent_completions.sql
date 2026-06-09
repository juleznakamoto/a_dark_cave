-- Leaderboard: only include completions from the last 6 months
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear existing leaderboard entries
  TRUNCATE TABLE leaderboard;

  -- Insert new entries from game_stats (best time per user per mode, last 6 months only)
  INSERT INTO leaderboard (user_id, username, email, play_time, cruel_mode, completed_at)
  SELECT DISTINCT ON (gs.user_id, (completion->>'gameMode')::text)
    gs.user_id,
    gs.username,
    au.email,
    (completion->>'playTime')::bigint as play_time,
    CASE 
      WHEN (completion->>'gameMode')::text = 'cruel' THEN true
      ELSE false
    END as cruel_mode,
    to_timestamp((completion->>'finishTime')::bigint / 1000.0) as completed_at
  FROM game_saves gs
  LEFT JOIN auth.users au ON gs.user_id = au.id
  CROSS JOIN LATERAL jsonb_array_elements(gs.game_stats) AS completion
  WHERE 
    gs.game_stats IS NOT NULL 
    AND jsonb_array_length(gs.game_stats) > 0
    AND (completion->>'playTime') IS NOT NULL
    AND (completion->>'finishTime') IS NOT NULL
    AND to_timestamp((completion->>'finishTime')::bigint / 1000.0) >= NOW() - INTERVAL '6 months'
  ORDER BY gs.user_id, (completion->>'gameMode')::text, (completion->>'playTime')::bigint ASC
  ON CONFLICT (user_id, cruel_mode) 
  DO UPDATE SET
    play_time = EXCLUDED.play_time,
    username = EXCLUDED.username,
    completed_at = EXCLUDED.completed_at
  WHERE EXCLUDED.play_time < leaderboard.play_time;

  -- Update the last_updated timestamp
  INSERT INTO leaderboard_metadata (key, value)
  VALUES ('last_updated', NOW()::text)
  ON CONFLICT (key) DO UPDATE SET value = NOW()::text;
END;
$$;
