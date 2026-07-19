-- Sidecar full-document cloud save (Phase 1 dual-write).
-- Does NOT modify save_game_with_analytics or legacy game_state merge behavior.
-- Load path continues to use game_state only; game_state_v2 is write-only until a later cutover.

ALTER TABLE game_saves
  ADD COLUMN IF NOT EXISTS game_state_v2 JSONB,
  ADD COLUMN IF NOT EXISTS save_revision BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS schema_version INTEGER;

COMMENT ON COLUMN game_saves.game_state_v2 IS
  'Parallel full GameState blob for save V2 dual-write. Not used for load yet.';
COMMENT ON COLUMN game_saves.save_revision IS
  'Monotonic revision for future V2 OCC. Incremented only by save_game_state_v2.';
COMMENT ON COLUMN game_saves.schema_version IS
  'Save schema version of game_state_v2 (client SAVE_SCHEMA_VERSION_V2).';

-- Upsert-safe update of sidecar columns only. Never inserts a row (legacy save must exist).
-- Does not touch game_state, game_stats, or updated_at — legacy path remains authoritative.
CREATE OR REPLACE FUNCTION public.save_game_state_v2(
  p_game_state JSONB,
  p_schema_version INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_state IS NULL OR jsonb_typeof(p_game_state) <> 'object' THEN
    RAISE EXCEPTION 'Invalid game_state: must be a non-null object';
  END IF;

  IF p_game_state = '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid game_state: cannot be empty';
  END IF;

  UPDATE game_saves
  SET
    game_state_v2 = p_game_state,
    save_revision = COALESCE(save_revision, 0) + 1,
    schema_version = p_schema_version
  WHERE user_id = v_user_id;

  -- No row yet (legacy save has not created one): no-op. Never INSERT here.
END;
$$;

COMMENT ON FUNCTION public.save_game_state_v2(JSONB, INTEGER) IS
  'Sidecar dual-write of full game_state_v2. Does not modify legacy game_state.';

REVOKE ALL ON FUNCTION public.save_game_state_v2(JSONB, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_game_state_v2(JSONB, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_game_state_v2(JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_game_state_v2(JSONB, INTEGER) TO service_role;
