-- Retire the abandoned game_state_v2 dual-write sidecar.
-- V1 cloud saves now use full-document replace (migration 030); load never used V2.
-- Historical migrations 028/029 remain for environments that applied them.

DROP FUNCTION IF EXISTS public.save_game_state_v2(JSONB, INTEGER);
DROP FUNCTION IF EXISTS public.save_game_state_v2(JSONB, INTEGER, JSONB, JSONB, BOOLEAN, BOOLEAN);

ALTER TABLE public.game_saves
  DROP COLUMN IF EXISTS game_state_v2,
  DROP COLUMN IF EXISTS save_revision,
  DROP COLUMN IF EXISTS schema_version;
