-- Future saves only. Does not rewrite existing game_stats rows or win flags.
--
-- A finish row is a leaderboard completion. Record one only for the same
-- cube beats that award hasWonAnyGame on the client: cube13, cube15a/b,
-- cube16a/b. cube14 is dialogue before the communicate ending, so it was
-- inserting a finish while the win flag was still false.
--
-- Dedupe on startTime as well as gameId. Load mints a gameId when the save
-- has none, and the old check treated that as a new run.

DO $$
DECLARE
  def text;
  patched text;
  old_completed text := $old$
      v_game_completed := (
        (v_merged_state->'events'->>'cube13')::boolean = true OR
        (v_merged_state->'events'->>'cube14a')::boolean = true OR
        (v_merged_state->'events'->>'cube14b')::boolean = true OR
        (v_merged_state->'events'->>'cube14c')::boolean = true OR
        (v_merged_state->'events'->>'cube14d')::boolean = true OR
        (v_merged_state->'events'->>'cube15a')::boolean = true OR
        (v_merged_state->'events'->>'cube15b')::boolean = true
      );$old$;
  new_completed text := $new$
      v_game_completed := (
        (v_merged_state->'events'->>'cube13')::boolean = true OR
        (v_merged_state->'events'->>'cube15a')::boolean = true OR
        (v_merged_state->'events'->>'cube15b')::boolean = true OR
        (v_merged_state->'events'->>'cube16a')::boolean = true OR
        (v_merged_state->'events'->>'cube16b')::boolean = true
      );$new$;
  old_recorded text := $old$
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

        v_start_time := (v_merged_state->>'startTime')::bigint;$old$;
  new_recorded text := $new$
      v_start_time := (v_merged_state->>'startTime')::bigint;

      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_existing_game_stats) AS elem
        WHERE (v_game_id IS NULL AND (elem->>'gameId') IS NULL)
           OR (v_game_id IS NOT NULL AND elem->>'gameId' = v_game_id)
           OR (
             v_start_time > 0
             AND (elem->>'startTime') ~ '^[0-9]+$'
             AND (elem->>'startTime')::bigint = v_start_time
           )
      ) INTO v_already_recorded;

      IF NOT v_already_recorded THEN
        v_game_mode := CASE
          WHEN (v_merged_state->>'cruelMode')::boolean = true THEN 'cruel'
          ELSE 'normal'
        END;
$new$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'save_game_with_analytics'
  LIMIT 1;

  IF def IS NULL THEN
    RAISE EXCEPTION 'save_game_with_analytics not found';
  END IF;

  patched := replace(def, E'\r', '');
  old_completed := replace(old_completed, E'\r', '');
  new_completed := replace(new_completed, E'\r', '');
  old_recorded := replace(old_recorded, E'\r', '');
  new_recorded := replace(new_recorded, E'\r', '');

  IF patched LIKE '%cube14a%' THEN
    IF position(old_completed IN patched) = 0 THEN
      RAISE EXCEPTION 'Unexpected save completion predicate';
    END IF;
    patched := replace(patched, old_completed, new_completed);
  END IF;

  IF position('elem->>''startTime''' IN patched) = 0 THEN
    IF position(old_recorded IN patched) = 0 THEN
      RAISE EXCEPTION 'Unexpected save completion dedupe block';
    END IF;
    patched := replace(patched, old_recorded, new_recorded);
  END IF;

  IF patched LIKE '%cube14a%' THEN
    RAISE EXCEPTION 'Failed to drop cube14 from save completion';
  END IF;

  IF position('cube16b' IN patched) = 0 THEN
    RAISE EXCEPTION 'Failed to record cube16 as a win';
  END IF;

  IF position('elem->>''startTime''' IN patched) = 0 THEN
    RAISE EXCEPTION 'Failed to dedupe save completion on startTime';
  END IF;

  EXECUTE patched;
END $$;
