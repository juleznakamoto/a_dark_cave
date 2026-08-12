-- Allow limited resources to exceed warehouse storage on cloud save.
-- Event rewards may overcap client-side (excess kept until spent); production stays capped.
-- Replaces the hard storage-limit reject with a sanity ceiling (max(limit*20, 100000)).

DO $$
DECLARE
  def text;
  patched text;
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

  IF def LIKE '%exceeds sanity ceiling%' THEN
    RAISE NOTICE 'save_game_with_analytics already allows event resource overcap';
    RETURN;
  END IF;

  IF def NOT LIKE '%exceeds storage limit%' THEN
    RAISE EXCEPTION
      'Unexpected save_game_with_analytics body; storage limit check not found';
  END IF;

  patched := replace(
    def,
    'v_resource_limit NUMERIC;',
    E'v_resource_limit NUMERIC;\n      v_sanity_ceiling NUMERIC;'
  );

  patched := regexp_replace(
    patched,
    E'IF v_new_res > v_resource_limit THEN[[:space:]]+RAISE EXCEPTION ''Save rejected: resource % \\(%\\) exceeds storage limit \\(%\\)'',[[:space:]]+v_resource_key, v_new_res, v_resource_limit;[[:space:]]+END IF;',
    $r$-- Event rewards may exceed warehouse storage (client keeps excess until spent).
            -- Production remains capped client-side. Sanity ceiling catches blatant manipulation.
            v_sanity_ceiling := GREATEST(v_resource_limit * 20, 100000);
            IF v_new_res > v_sanity_ceiling THEN
              RAISE EXCEPTION 'Save rejected: resource % (%) exceeds sanity ceiling (%)',
                v_resource_key, v_new_res, v_sanity_ceiling;
            END IF;$r$,
    'n'
  );

  IF patched NOT LIKE '%exceeds sanity ceiling%' THEN
    RAISE EXCEPTION 'Failed to patch save_game_with_analytics resource overcap check';
  END IF;

  EXECUTE patched;
END $$;
