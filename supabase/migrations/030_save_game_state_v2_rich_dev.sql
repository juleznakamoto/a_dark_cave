-- Expand save_game_state_v2 to mirror V1 responsibilities (full-document replace, not deep-merge):
-- playTime OCC, resource anti-cheat, game completion → game_stats, click/resource analytics.
-- Still writes game_state_v2 only (does NOT replace legacy game_state / load path).
--
-- DEV-ONLY rich path: no-ops unless app_config.environment = 'development'.
-- Do not apply this migration to production — prod keeps thin migration 028.
-- Client: thin dual-write on by default (all builds); rich args only when Vite DEV.

DROP FUNCTION IF EXISTS public.save_game_state_v2(JSONB, INTEGER);

CREATE OR REPLACE FUNCTION public.save_game_state_v2(
  p_game_state JSONB,
  p_schema_version INTEGER DEFAULT 1,
  p_click_analytics JSONB DEFAULT NULL,
  p_resource_analytics JSONB DEFAULT NULL,
  p_clear_analytics BOOLEAN DEFAULT FALSE,
  p_allow_playtime_overwrite BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_row RECORD;
  v_baseline JSONB;
  v_existing_playtime NUMERIC;
  v_new_playtime NUMERIC;
  v_existing_clicks JSONB;
  v_existing_resources JSONB;
  v_updated_clicks JSONB;
  v_updated_resources JSONB;
  v_playtime_ms NUMERIC;
  v_playtime_minutes INTEGER;
  v_playtime_bucket INTEGER;
  v_playtime_key TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Hard gate: rich V2 path must not run on production DBs.
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'environment' AND value = 'development'
  ) THEN
    RETURN;
  END IF;

  IF p_game_state IS NULL OR jsonb_typeof(p_game_state) <> 'object' THEN
    RAISE EXCEPTION 'Invalid game_state: must be a non-null object';
  END IF;

  IF p_game_state = '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid game_state: cannot be empty';
  END IF;

  SELECT
    game_state,
    game_state_v2,
    game_stats,
    save_revision
  INTO v_existing_row
  FROM game_saves
  WHERE user_id = v_user_id;

  -- Legacy save must exist first (V1 creates the row). Never INSERT here.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Baseline for OCC / anti-cheat: prefer prior V2 blob, else legacy game_state.
  v_baseline := COALESCE(v_existing_row.game_state_v2, v_existing_row.game_state);

  -- OCC: playTime must not go backwards (same rule as V1), unless overwrite (restart).
  IF v_baseline IS NOT NULL AND p_game_state ? 'playTime' AND NOT p_allow_playtime_overwrite THEN
    v_existing_playtime := COALESCE((v_baseline->>'playTime')::NUMERIC, 0);
    v_new_playtime := COALESCE((p_game_state->>'playTime')::NUMERIC, 0);
    IF v_new_playtime < v_existing_playtime THEN
      RAISE EXCEPTION 'OCC violation: new playTime (%) must not be less than existing playTime (%)',
        v_new_playtime, v_existing_playtime;
    END IF;
  END IF;

  -- Resource anti-cheat (skipped when app_config marks development — same as V1).
  -- Full-document compare vs baseline (no diff keys).
  IF v_baseline IS NOT NULL
     AND NOT p_allow_playtime_overwrite
     AND NOT EXISTS (SELECT 1 FROM app_config WHERE key = 'environment' AND value = 'development')
  THEN
    DECLARE
      v_resource_key TEXT;
      v_old_res NUMERIC;
      v_new_res NUMERIC;
      v_storage_level INTEGER := 0;
      v_resource_limit NUMERIC;
      v_gold_delta NUMERIC;
      v_silver_delta NUMERIC;
      v_achievements_changed BOOLEAN;
      v_purchases_changed BOOLEAN;
    BEGIN
      IF COALESCE((p_game_state->'buildings'->>'greatVault')::INTEGER, 0) > 0 THEN v_storage_level := 6;
      ELSIF COALESCE((p_game_state->'buildings'->>'grandRepository')::INTEGER, 0) > 0 THEN v_storage_level := 5;
      ELSIF COALESCE((p_game_state->'buildings'->>'villageWarehouse')::INTEGER, 0) > 0 THEN v_storage_level := 4;
      ELSIF COALESCE((p_game_state->'buildings'->>'fortifiedStorehouse')::INTEGER, 0) > 0 THEN v_storage_level := 3;
      ELSIF COALESCE((p_game_state->'buildings'->>'storehouse')::INTEGER, 0) > 0 THEN v_storage_level := 2;
      ELSIF COALESCE((p_game_state->'buildings'->>'supplyHut')::INTEGER, 0) > 0 THEN v_storage_level := 1;
      END IF;

      v_resource_limit := CASE v_storage_level
        WHEN 0 THEN 500
        WHEN 1 THEN 1000
        WHEN 2 THEN 2500
        WHEN 3 THEN 5000
        WHEN 4 THEN 10000
        WHEN 5 THEN 25000
        WHEN 6 THEN 50000
        ELSE 500
      END;

      IF p_game_state ? 'resources' THEN
        FOR v_resource_key IN SELECT jsonb_object_keys(p_game_state->'resources') LOOP
          IF v_resource_key NOT IN ('gold', 'silver', 'insight') THEN
            v_new_res := COALESCE((p_game_state->'resources'->>v_resource_key)::NUMERIC, 0);
            IF v_new_res > v_resource_limit THEN
              RAISE EXCEPTION 'Save rejected: resource % (%) exceeds storage limit (%)',
                v_resource_key, v_new_res, v_resource_limit;
            END IF;
          END IF;
        END LOOP;
      END IF;

      v_achievements_changed :=
        COALESCE(v_baseline->'claimedAchievements', 'null'::jsonb)
        IS DISTINCT FROM
        COALESCE(p_game_state->'claimedAchievements', 'null'::jsonb);

      v_purchases_changed :=
        COALESCE(v_baseline->'activatedPurchases', 'null'::jsonb)
        IS DISTINCT FROM
        COALESCE(p_game_state->'activatedPurchases', 'null'::jsonb);

      v_old_res := COALESCE((v_baseline->'resources'->>'silver')::NUMERIC, 0);
      v_new_res := COALESCE((p_game_state->'resources'->>'silver')::NUMERIC, 0);
      v_silver_delta := v_new_res - v_old_res;
      IF v_silver_delta > 5000 AND NOT v_achievements_changed THEN
        RAISE EXCEPTION 'Save rejected: silver delta % exceeds max 5000 per save (claimedAchievements unchanged)',
          v_silver_delta;
      END IF;

      v_old_res := COALESCE((v_baseline->'resources'->>'gold')::NUMERIC, 0);
      v_new_res := COALESCE((p_game_state->'resources'->>'gold')::NUMERIC, 0);
      v_gold_delta := v_new_res - v_old_res;
      IF v_gold_delta > 2000 AND NOT v_purchases_changed THEN
        RAISE EXCEPTION 'Save rejected: gold delta % exceeds max 2000 per save (activatedPurchases unchanged)',
          v_gold_delta;
      END IF;
    END;
  END IF;

  -- Game completion → game_stats (idempotent by gameId; same rules as V1).
  DECLARE
    v_game_completed BOOLEAN := FALSE;
    v_existing_game_stats JSONB;
    v_new_game_stats JSONB;
    v_completion_record JSONB;
    v_game_mode TEXT;
    v_start_time BIGINT;
    v_finish_time BIGINT;
    v_playtime_ms_comp BIGINT;
    v_game_id TEXT;
    v_already_recorded BOOLEAN := FALSE;
  BEGIN
    v_existing_game_stats := COALESCE(v_existing_row.game_stats, '[]'::jsonb);

    IF p_game_state ? 'events' THEN
      v_game_completed := (
        (p_game_state->'events'->>'cube13')::boolean = true OR
        (p_game_state->'events'->>'cube14a')::boolean = true OR
        (p_game_state->'events'->>'cube14b')::boolean = true OR
        (p_game_state->'events'->>'cube14c')::boolean = true OR
        (p_game_state->'events'->>'cube14d')::boolean = true OR
        (p_game_state->'events'->>'cube15a')::boolean = true OR
        (p_game_state->'events'->>'cube15b')::boolean = true
      );
    END IF;

    IF v_game_completed
       AND p_game_state ? 'playTime'
       AND p_game_state ? 'startTime'
       AND p_game_state ? 'gameId'
    THEN
      v_game_id := p_game_state->>'gameId';

      IF v_game_id IS NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM jsonb_array_elements(v_existing_game_stats) AS elem
          WHERE (elem->>'gameId') IS NULL
        ) INTO v_already_recorded;
      ELSE
        SELECT EXISTS (
          SELECT 1 FROM jsonb_array_elements(v_existing_game_stats) AS elem
          WHERE elem->>'gameId' = v_game_id
        ) INTO v_already_recorded;
      END IF;

      IF NOT v_already_recorded THEN
        v_game_mode := CASE
          WHEN (p_game_state->>'cruelMode')::boolean = true THEN 'cruel'
          ELSE 'normal'
        END;
        v_start_time := (p_game_state->>'startTime')::bigint;
        v_finish_time := EXTRACT(EPOCH FROM NOW())::bigint * 1000;
        v_playtime_ms_comp := (p_game_state->>'playTime')::bigint;
        v_completion_record := jsonb_build_object(
          'gameId', v_game_id,
          'gameMode', v_game_mode,
          'startTime', v_start_time,
          'finishTime', v_finish_time,
          'playTime', v_playtime_ms_comp
        );
        v_new_game_stats := v_existing_game_stats || jsonb_build_array(v_completion_record);

        UPDATE game_saves
        SET
          game_state_v2 = p_game_state,
          save_revision = COALESCE(save_revision, 0) + 1,
          schema_version = p_schema_version,
          game_stats = v_new_game_stats
        WHERE user_id = v_user_id;
      ELSE
        UPDATE game_saves
        SET
          game_state_v2 = p_game_state,
          save_revision = COALESCE(save_revision, 0) + 1,
          schema_version = p_schema_version
        WHERE user_id = v_user_id;
      END IF;
    ELSE
      UPDATE game_saves
      SET
        game_state_v2 = p_game_state,
        save_revision = COALESCE(save_revision, 0) + 1,
        schema_version = p_schema_version
      WHERE user_id = v_user_id;
    END IF;
  END;

  -- Click / resource analytics (same button_clicks bucketing as V1).
  IF p_clear_analytics THEN
    DELETE FROM button_clicks WHERE user_id = v_user_id;
  ELSE
    v_playtime_ms := COALESCE((p_game_state->>'playTime')::NUMERIC, 0);
    v_playtime_minutes := FLOOR(v_playtime_ms / 1000 / 60);
    v_playtime_bucket := FLOOR(v_playtime_minutes / 10) * 10;
    v_playtime_key := v_playtime_bucket || 'm';

    SELECT clicks, resources INTO v_existing_clicks, v_existing_resources
    FROM button_clicks
    WHERE user_id = v_user_id;

    IF p_click_analytics IS NOT NULL AND p_click_analytics != '{}'::jsonb THEN
      IF v_existing_clicks IS NOT NULL THEN
        IF v_existing_clicks ? v_playtime_key THEN
          DECLARE
            v_existing_bucket JSONB;
            v_merged_bucket JSONB;
            v_key TEXT;
            v_existing_count INTEGER;
            v_new_count INTEGER;
          BEGIN
            v_existing_bucket := v_existing_clicks->v_playtime_key;
            v_merged_bucket := '{}'::jsonb;

            FOR v_key IN SELECT jsonb_object_keys(v_existing_bucket) LOOP
              v_existing_count := (v_existing_bucket->>v_key)::INTEGER;
              v_new_count := COALESCE((p_click_analytics->>v_key)::INTEGER, 0);
              v_merged_bucket := jsonb_set(
                v_merged_bucket,
                ARRAY[v_key],
                to_jsonb(v_existing_count + v_new_count)
              );
            END LOOP;

            FOR v_key IN SELECT jsonb_object_keys(p_click_analytics) LOOP
              IF NOT (v_existing_bucket ? v_key) THEN
                v_new_count := (p_click_analytics->>v_key)::INTEGER;
                v_merged_bucket := jsonb_set(
                  v_merged_bucket,
                  ARRAY[v_key],
                  to_jsonb(v_new_count)
                );
              END IF;
            END LOOP;

            v_updated_clicks := jsonb_set(
              v_existing_clicks,
              ARRAY[v_playtime_key],
              v_merged_bucket
            );
          END;
        ELSE
          v_updated_clicks := v_existing_clicks || jsonb_build_object(v_playtime_key, p_click_analytics);
        END IF;
      ELSE
        v_updated_clicks := jsonb_build_object(v_playtime_key, p_click_analytics);
      END IF;
    ELSE
      v_updated_clicks := v_existing_clicks;
    END IF;

    IF p_resource_analytics IS NOT NULL AND p_resource_analytics != '{}'::jsonb THEN
      IF v_existing_resources IS NOT NULL THEN
        IF v_existing_resources ? v_playtime_key THEN
          v_updated_resources := jsonb_set(
            v_existing_resources,
            ARRAY[v_playtime_key],
            p_resource_analytics
          );
        ELSE
          v_updated_resources := v_existing_resources
            || jsonb_build_object(v_playtime_key, p_resource_analytics);
        END IF;
      ELSE
        v_updated_resources := jsonb_build_object(v_playtime_key, p_resource_analytics);
      END IF;
    ELSE
      v_updated_resources := v_existing_resources;
    END IF;

    IF v_updated_clicks IS NOT NULL OR v_updated_resources IS NOT NULL THEN
      INSERT INTO button_clicks (user_id, timestamp, clicks, resources)
      VALUES (
        v_user_id,
        NOW(),
        COALESCE(v_updated_clicks, '{}'::jsonb),
        COALESCE(v_updated_resources, '{}'::jsonb)
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        clicks = EXCLUDED.clicks,
        resources = EXCLUDED.resources,
        timestamp = EXCLUDED.timestamp;
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.save_game_state_v2(JSONB, INTEGER, JSONB, JSONB, BOOLEAN, BOOLEAN) IS
  'DEV-only rich V2 sidecar: full-document write to game_state_v2 + playTime OCC + anti-cheat + completion stats + analytics. No-ops unless app_config.environment=development. Does not replace legacy game_state.';

REVOKE ALL ON FUNCTION public.save_game_state_v2(JSONB, INTEGER, JSONB, JSONB, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_game_state_v2(JSONB, INTEGER, JSONB, JSONB, BOOLEAN, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_game_state_v2(JSONB, INTEGER, JSONB, JSONB, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_game_state_v2(JSONB, INTEGER, JSONB, JSONB, BOOLEAN, BOOLEAN) TO service_role;
