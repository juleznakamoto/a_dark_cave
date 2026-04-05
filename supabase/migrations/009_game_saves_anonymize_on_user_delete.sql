-- Allow game_saves rows to outlive auth.users for aggregate stats: clear user_id on account
-- deletion (SET NULL) instead of CASCADE-deleting the row. One row per non-null user_id.

ALTER TABLE game_saves DROP CONSTRAINT IF EXISTS game_saves_user_id_key;
ALTER TABLE game_saves DROP CONSTRAINT IF EXISTS game_saves_user_id_fkey;

ALTER TABLE game_saves ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE game_saves
  ADD CONSTRAINT game_saves_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS game_saves_user_id_unique_when_set
  ON game_saves (user_id)
  WHERE user_id IS NOT NULL;
