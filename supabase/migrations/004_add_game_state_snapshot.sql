
-- Add game_state_snapshot column to button_analytics table
ALTER TABLE button_analytics
ADD COLUMN IF NOT EXISTS game_state_snapshot JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_button_analytics_snapshot ON button_analytics USING GIN (game_state_snapshot);
