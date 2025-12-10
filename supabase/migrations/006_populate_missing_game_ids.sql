
-- Populate missing gameIds for existing saves
UPDATE game_saves
SET game_state = jsonb_set(
  game_state,
  '{gameId}',
  to_jsonb('legacy-' || user_id::text || '-' || COALESCE(game_state->>'startTime', EXTRACT(EPOCH FROM created_at)::bigint * 1000)::text)
)
WHERE game_state->>'gameId' IS NULL OR game_state->>'gameId' = 'null';

-- Add comment
COMMENT ON COLUMN game_saves.game_state IS 'Game state JSONB - gameId should always be present for completion tracking';
