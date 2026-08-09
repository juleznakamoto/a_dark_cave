-- Protect invitee referralProcessed / referralCode from full-document cloud save wipes.
-- processReferral writes these on the invitee's game_state; clients historically omitted
-- referralProcessed from the save allowlist (missing from gameStateSchema), so the next
-- p_full_replace dropped the key. Gold/log often remained, which broke idempotency and
-- admin stats that key off referralProcessed=true.
-- Extends merge_game_state_referrals from migration 037 (referrals[] union-merge unchanged).

CREATE OR REPLACE FUNCTION public.merge_game_state_referrals(
  p_existing JSONB,
  p_incoming JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_merged_refs JSONB;
  v_referral_count INTEGER;
  v_referred_users JSONB;
  v_existing_count INTEGER;
  v_incoming_count INTEGER;
  v_result JSONB;
  v_existing_code TEXT;
  v_incoming_code TEXT;
BEGIN
  IF p_existing IS NULL THEN
    RETURN p_incoming;
  END IF;
  IF p_incoming IS NULL THEN
    RETURN p_existing;
  END IF;

  WITH all_entries AS (
    SELECT
      e->>'userId' AS user_id,
      COALESCE((e->>'claimed')::boolean, false) AS claimed,
      COALESCE((e->>'timestamp')::bigint, 0) AS ts
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(COALESCE(p_existing->'referrals', '[]'::jsonb)) = 'array'
          THEN COALESCE(p_existing->'referrals', '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) AS e
    WHERE COALESCE(e->>'userId', '') <> ''
    UNION ALL
    SELECT
      e->>'userId' AS user_id,
      COALESCE((e->>'claimed')::boolean, false) AS claimed,
      COALESCE((e->>'timestamp')::bigint, 0) AS ts
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(COALESCE(p_incoming->'referrals', '[]'::jsonb)) = 'array'
          THEN COALESCE(p_incoming->'referrals', '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) AS e
    WHERE COALESCE(e->>'userId', '') <> ''
  ),
  collapsed AS (
    SELECT
      user_id,
      bool_or(claimed) AS claimed,
      max(ts) AS ts
    FROM all_entries
    GROUP BY user_id
  ),
  ordered AS (
    SELECT
      jsonb_build_object(
        'userId', user_id,
        'claimed', claimed,
        'timestamp', ts
      ) AS entry
    FROM collapsed
    ORDER BY ts ASC, user_id ASC
  )
  SELECT COALESCE(
    jsonb_agg(entry ORDER BY (entry->>'timestamp')::bigint ASC, entry->>'userId' ASC),
    '[]'::jsonb
  )
  INTO v_merged_refs
  FROM ordered;

  v_existing_count := COALESCE((p_existing->>'referralCount')::integer, 0);
  v_incoming_count := COALESCE((p_incoming->>'referralCount')::integer, 0);
  v_referral_count := GREATEST(
    v_existing_count,
    v_incoming_count,
    jsonb_array_length(v_merged_refs)
  );

  SELECT COALESCE(jsonb_agg(e->>'userId'), '[]'::jsonb)
  INTO v_referred_users
  FROM jsonb_array_elements(v_merged_refs) AS e;

  v_result := jsonb_set(
    jsonb_set(
      jsonb_set(
        p_incoming,
        '{referrals}',
        v_merged_refs,
        true
      ),
      '{referralCount}',
      to_jsonb(v_referral_count),
      true
    ),
    '{referredUsers}',
    COALESCE(v_referred_users, '[]'::jsonb),
    true
  );

  -- Invitee: once true, never clear via stale client payload.
  IF COALESCE((p_existing->>'referralProcessed')::boolean, false)
     OR COALESCE((v_result->>'referralProcessed')::boolean, false)
  THEN
    v_result := jsonb_set(v_result, '{referralProcessed}', 'true'::jsonb, true);
  END IF;

  -- Prefer an existing non-empty referralCode over a missing/blank incoming value.
  v_existing_code := NULLIF(btrim(COALESCE(p_existing->>'referralCode', '')), '');
  v_incoming_code := NULLIF(btrim(COALESCE(v_result->>'referralCode', '')), '');
  IF v_existing_code IS NOT NULL THEN
    v_result := jsonb_set(v_result, '{referralCode}', to_jsonb(v_existing_code), true);
  ELSIF v_incoming_code IS NOT NULL THEN
    v_result := jsonb_set(v_result, '{referralCode}', to_jsonb(v_incoming_code), true);
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.merge_game_state_referrals(JSONB, JSONB) IS
  'Union-merge referrals by userId; OR-preserve referralProcessed; keep non-empty referralCode. Used by save_game_with_analytics so full-replace cannot wipe server-written invite rewards.';
