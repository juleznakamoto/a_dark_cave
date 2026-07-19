-- Flagged full-document cloud save on the legacy V1 path (game_state).
--
-- New clients send the full GameState blob + p_full_replace=true so nested deletes
-- work (deep-merge cannot express key removal). Old clients omit the flag (default
-- false) and keep incremental deep-merge + permanent-item protection.
--
-- Deploy order: this SQL → edge function (pass-through) → client (full payload).
-- Rollback: client kill switch VITE_SAVE_FULL_REPLACE=0 (diff+merge again).

DROP FUNCTION IF EXISTS public.save_game_with_analytics(JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION public.save_game_with_analytics(
  p_game_state_diff JSONB,
  p_click_analytics JSONB DEFAULT NULL,
  p_resource_analytics JSONB DEFAULT NULL,
  p_clear_analytics BOOLEAN DEFAULT FALSE,
  p_allow_playtime_overwrite BOOLEAN DEFAULT FALSE,
  p_full_replace BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_state JSONB;
  v_merged_state JSONB;
  v_existing_clicks JSONB;
  v_existing_resources JSONB;
  v_updated_clicks JSONB;
  v_updated_resources JSONB;
  v_playtime_ms NUMERIC;
  v_playtime_minutes INTEGER;
  v_playtime_bucket INTEGER;
  v_playtime_key TEXT;
  v_existing_playtime NUMERIC;
  v_new_playtime NUMERIC;
  v_slice TEXT;
  v_owned_items JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT game_state INTO v_existing_state
  FROM game_saves
  WHERE user_id = v_user_id;

  -- OCC: Validate playTime if both states exist (unless overwrite is allowed)
  IF v_existing_state IS NOT NULL AND p_game_state_diff ? 'playTime' THEN
    v_existing_playtime := COALESCE((v_existing_state->>'playTime')::NUMERIC, 0);
    v_new_playtime := COALESCE((p_game_state_diff->>'playTime')::NUMERIC, 0);

    IF p_allow_playtime_overwrite THEN
      RAISE NOTICE 'OCC check SKIPPED: playTime overwrite allowed (game restart) - new: %, existing: %',
        v_new_playtime, v_existing_playtime;
    ELSE
      IF v_new_playtime < v_existing_playtime THEN
        RAISE EXCEPTION 'OCC violation: new playTime (%) must not be less than existing playTime (%)',
          v_new_playtime, v_existing_playtime;
      ELSIF v_new_playtime > v_existing_playtime THEN
        RAISE NOTICE 'OCC check passed: new playTime (%) > existing playTime (%)',
          v_new_playtime, v_existing_playtime;
      END IF;
    END IF;
  END IF;

  -- Apply payload: full document replace, restart shallow top-level replace, or deep-merge.
  IF p_full_replace OR v_existing_state IS NULL THEN
    v_merged_state := p_game_state_diff;
  ELSIF p_allow_playtime_overwrite THEN
    -- Restart without full_replace (legacy clients): top-level keys replace wholesale.
    v_merged_state := v_existing_state || p_game_state_diff;
  ELSE
    v_merged_state := jsonb_deep_merge_objects(v_existing_state, p_game_state_diff);
  END IF;

  -- ========== PERMANENT-ITEM PROTECTION ==========
  -- Still applied on full_replace (unless restart) so a buggy all-false tools blob
  -- cannot wipe permanent ownership. Delete-semantic maps are unaffected.
  IF v_existing_state IS NOT NULL AND NOT p_allow_playtime_overwrite THEN
    FOREACH v_slice IN ARRAY ARRAY['tools', 'weapons', 'books'] LOOP
      IF v_existing_state ? v_slice
         AND jsonb_typeof(v_existing_state->v_slice) = 'object'
      THEN
        SELECT COALESCE(jsonb_object_agg(e.key, 'true'::jsonb), '{}'::jsonb)
          INTO v_owned_items
        FROM jsonb_each(v_existing_state->v_slice) AS e
        WHERE e.value::text = 'true';

        IF v_owned_items <> '{}'::jsonb THEN
          v_merged_state := jsonb_set(
            v_merged_state,
            ARRAY[v_slice],
            COALESCE(v_merged_state->v_slice, '{}'::jsonb) || v_owned_items,
            true
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  -- ========== END PERMANENT-ITEM PROTECTION ==========

  -- ========== RESOURCE MANIPULATION PREVENTION ==========
  IF v_existing_state IS NOT NULL AND NOT p_allow_playtime_overwrite
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
      IF COALESCE((v_merged_state->'buildings'->>'greatVault')::INTEGER, 0) > 0 THEN v_storage_level := 6;
      ELSIF COALESCE((v_merged_state->'buildings'->>'grandRepository')::INTEGER, 0) > 0 THEN v_storage_level := 5;
      ELSIF COALESCE((v_merged_state->'buildings'->>'villageWarehouse')::INTEGER, 0) > 0 THEN v_storage_level := 4;
      ELSIF COALESCE((v_merged_state->'buildings'->>'fortifiedStorehouse')::INTEGER, 0) > 0 THEN v_storage_level := 3;
      ELSIF COALESCE((v_merged_state->'buildings'->>'storehouse')::INTEGER, 0) > 0 THEN v_storage_level := 2;
      ELSIF COALESCE((v_merged_state->'buildings'->>'supplyHut')::INTEGER, 0) > 0 THEN v_storage_level := 1;
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

      IF v_merged_state ? 'resources' THEN
        FOR v_resource_key IN SELECT jsonb_object_keys(v_merged_state->'resources') LOOP
          IF v_resource_key NOT IN ('gold', 'silver', 'insight') THEN
            v_new_res := COALESCE((v_merged_state->'resources'->>v_resource_key)::NUMERIC, 0);
            IF v_new_res > v_resource_limit THEN
              RAISE EXCEPTION 'Save rejected: resource % (%) exceeds storage limit (%)',
                v_resource_key, v_new_res, v_resource_limit;
            END IF;
          END IF;
        END LOOP;
      END IF;

      -- Full replace always includes claimedAchievements / activatedPurchases keys, so
      -- "key present in payload" is meaningless — compare against the prior blob instead.
      IF p_full_replace THEN
        v_achievements_changed :=
          COALESCE(v_existing_state->'claimedAchievements', 'null'::jsonb)
          IS DISTINCT FROM
          COALESCE(v_merged_state->'claimedAchievements', 'null'::jsonb);
        v_purchases_changed :=
          COALESCE(v_existing_state->'activatedPurchases', 'null'::jsonb)
          IS DISTINCT FROM
          COALESCE(v_merged_state->'activatedPurchases', 'null'::jsonb);
      ELSE
        v_achievements_changed := p_game_state_diff ? 'claimedAchievements';
        v_purchases_changed := p_game_state_diff ? 'activatedPurchases';
      END IF;

      v_old_res := COALESCE((v_existing_state->'resources'->>'silver')::NUMERIC, 0);
      v_new_res := COALESCE((v_merged_state->'resources'->>'silver')::NUMERIC, 0);
      v_silver_delta := v_new_res - v_old_res;
      IF v_silver_delta > 5000 AND NOT v_achievements_changed THEN
        RAISE EXCEPTION 'Save rejected: silver delta % exceeds max 5000 per save (claimedAchievements unchanged)',
          v_silver_delta;
      END IF;

      v_old_res := COALESCE((v_existing_state->'resources'->>'gold')::NUMERIC, 0);
      v_new_res := COALESCE((v_merged_state->'resources'->>'gold')::NUMERIC, 0);
      v_gold_delta := v_new_res - v_old_res;
      IF v_gold_delta > 2000 AND NOT v_purchases_changed THEN
        RAISE EXCEPTION 'Save rejected: gold delta % exceeds max 2000 per save (activatedPurchases unchanged)',
          v_gold_delta;
      END IF;
    END;
  END IF;
  -- ========== END RESOURCE MANIPULATION PREVENTION ==========

  -- Check if game was just completed
  DECLARE
    v_game_completed BOOLEAN := FALSE;
    v_existing_game_stats JSONB;
    v_new_game_stats JSONB;
    v_completion_record JSONB;
    v_game_mode TEXT;
    v_start_time BIGINT;
    v_finish_time BIGINT;
    v_playtime_ms BIGINT;
    v_game_id TEXT;
    v_already_recorded BOOLEAN := FALSE;
  BEGIN
    IF v_merged_state ? 'events' THEN
      v_game_completed := (
        (v_merged_state->'events'->>'cube13')::boolean = true OR
        (v_merged_state->'events'->>'cube14a')::boolean = true OR
        (v_merged_state->'events'->>'cube14b')::boolean = true OR
        (v_merged_state->'events'->>'cube14c')::boolean = true OR
        (v_merged_state->'events'->>'cube14d')::boolean = true OR
        (v_merged_state->'events'->>'cube15a')::boolean = true OR
        (v_merged_state->'events'->>'cube15b')::boolean = true
      );
    END IF;

    IF v_game_completed AND v_merged_state ? 'playTime' AND v_merged_state ? 'startTime' AND v_merged_state ? 'gameId' THEN
      v_game_id := v_merged_state->>'gameId';

      SELECT game_stats INTO v_existing_game_stats
      FROM game_saves
      WHERE user_id = v_user_id;

      IF v_existing_game_stats IS NULL THEN
        v_existing_game_stats := '[]'::jsonb;
      END IF;

      IF v_game_id IS NULL THEN
        SELECT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_existing_game_stats) AS elem
          WHERE (elem->>'gameId') IS NULL
        ) INTO v_already_recorded;
      ELSE
        SELECT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_existing_game_stats) AS elem
          WHERE elem->>'gameId' = v_game_id
        ) INTO v_already_recorded;
      END IF;

      IF NOT v_already_recorded THEN
        v_game_mode := CASE
          WHEN (v_merged_state->>'cruelMode')::boolean = true THEN 'cruel'
          ELSE 'normal'
        END;

        v_start_time := (v_merged_state->>'startTime')::bigint;
        v_finish_time := EXTRACT(EPOCH FROM NOW())::bigint * 1000;
        v_playtime_ms := (v_merged_state->>'playTime')::bigint;

        v_completion_record := jsonb_build_object(
          'gameId', v_game_id,
          'gameMode', v_game_mode,
          'startTime', v_start_time,
          'finishTime', v_finish_time,
          'playTime', v_playtime_ms
        );

        v_new_game_stats := v_existing_game_stats || jsonb_build_array(v_completion_record);

        INSERT INTO game_saves (user_id, game_state, game_stats, updated_at)
        VALUES (v_user_id, v_merged_state, v_new_game_stats, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          game_state = EXCLUDED.game_state,
          game_stats = EXCLUDED.game_stats,
          updated_at = EXCLUDED.updated_at;

        RAISE NOTICE 'Game completion recorded for gameId: %', v_game_id;
      ELSE
        INSERT INTO game_saves (user_id, game_state, updated_at)
        VALUES (v_user_id, v_merged_state, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          game_state = EXCLUDED.game_state,
          updated_at = EXCLUDED.updated_at;

        RAISE NOTICE 'Game completion already recorded for gameId: %', v_game_id;
      END IF;
    ELSE
      INSERT INTO game_saves (user_id, game_state, updated_at)
      VALUES (v_user_id, v_merged_state, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        game_state = EXCLUDED.game_state,
        updated_at = EXCLUDED.updated_at;
    END IF;
  END;

  -- Handle click and resource analytics
  IF p_clear_analytics THEN
    DELETE FROM button_clicks WHERE user_id = v_user_id;
  ELSE
    v_playtime_ms := (v_merged_state->>'playTime')::NUMERIC;
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
              v_merged_bucket := jsonb_set(v_merged_bucket, ARRAY[v_key], to_jsonb(v_existing_count + v_new_count));
            END LOOP;

            FOR v_key IN SELECT jsonb_object_keys(p_click_analytics) LOOP
              IF NOT (v_existing_bucket ? v_key) THEN
                v_new_count := (p_click_analytics->>v_key)::INTEGER;
                v_merged_bucket := jsonb_set(v_merged_bucket, ARRAY[v_key], to_jsonb(v_new_count));
              END IF;
            END LOOP;

            v_updated_clicks := jsonb_set(v_existing_clicks, ARRAY[v_playtime_key], v_merged_bucket);
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
          v_updated_resources := jsonb_set(v_existing_resources, ARRAY[v_playtime_key], p_resource_analytics);
        ELSE
          v_updated_resources := v_existing_resources || jsonb_build_object(v_playtime_key, p_resource_analytics);
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

COMMENT ON FUNCTION public.save_game_with_analytics(JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, BOOLEAN) IS
  'Cloud save: deep-merge by default; p_full_replace=true stores the payload as the full game_state. Permanent tools/weapons/books protection still applies unless playTime overwrite (restart).';

REVOKE ALL ON FUNCTION public.save_game_with_analytics(JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_game_with_analytics(JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_game_with_analytics(JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_game_with_analytics(JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, BOOLEAN) TO service_role;
