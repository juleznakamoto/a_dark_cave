
-- Add game_stats column to track multiple game completions
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS game_stats JSONB DEFAULT '[]'::jsonb;

-- Add index for faster querying of game completions
CREATE INDEX IF NOT EXISTS idx_game_stats_completions ON game_saves USING gin (game_stats);

-- Add comment explaining the structure
COMMENT ON COLUMN game_saves.game_stats IS 'Array of game completion records: [{gameId: string, gameMode: "normal"|"cruel", startTime: timestamp, finishTime: timestamp, playTime: number}]';
