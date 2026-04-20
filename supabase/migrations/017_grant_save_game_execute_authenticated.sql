-- Edge Function `save-game` invokes `save_game_with_analytics` via PostgREST using the
-- end-user JWT (role `authenticated`). Migration 001 revoked EXECUTE from `authenticated`,
-- which breaks that path on fresh databases unless privileges are restored.
GRANT EXECUTE ON FUNCTION public.save_game_with_analytics(jsonb, jsonb, jsonb, boolean, boolean) TO authenticated;
