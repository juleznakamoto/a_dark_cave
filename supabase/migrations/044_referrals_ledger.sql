-- Referrals ledger: one row per invitee. claim_referral inserts here and
-- projects flags/list onto existing saves with a row lock. It never replaces
-- a full game_state from a stale client snapshot.
-- Gold is granted on the client when referralProcessed flips or an unclaimed
-- list entry appears (same as today). This migration only makes credit durable.

CREATE TABLE IF NOT EXISTS public.referrals (
  invitee_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_not_self CHECK (invitee_id <> referrer_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals (referrer_id);

COMMENT ON TABLE public.referrals IS
  'Source of truth for invite credit. game_state.referrals / referralProcessed are projections.';

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.referral_ledger_slice(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'referrals', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'userId', r.invitee_id::text,
          'claimed', false,
          'timestamp', (EXTRACT(EPOCH FROM r.created_at) * 1000)::bigint
        )
        ORDER BY r.created_at ASC, r.invitee_id ASC
      )
      FROM public.referrals r
      WHERE r.referrer_id = p_user_id
    ), '[]'::jsonb),
    'referralCount', (
      SELECT COUNT(*)::integer FROM public.referrals WHERE referrer_id = p_user_id
    ),
    'referredUsers', COALESCE((
      SELECT jsonb_agg(r.invitee_id::text ORDER BY r.created_at ASC, r.invitee_id ASC)
      FROM public.referrals r
      WHERE r.referrer_id = p_user_id
    ), '[]'::jsonb),
    'referralProcessed', EXISTS (
      SELECT 1 FROM public.referrals WHERE invitee_id = p_user_id
    ),
    'referralCode', (
      SELECT r.code FROM public.referrals r WHERE r.invitee_id = p_user_id
    )
  );
$$;

COMMENT ON FUNCTION public.referral_ledger_slice(UUID) IS
  'Projection of the referrals ledger for one user (as referrer and as invitee).';

REVOKE ALL ON FUNCTION public.referral_ledger_slice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_ledger_slice(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_referral_ledger(
  p_user_id UUID,
  p_state JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state JSONB;
  v_slice JSONB;
BEGIN
  v_state := COALESCE(p_state, '{}'::jsonb);
  v_slice := public.referral_ledger_slice(p_user_id);
  -- Incoming document is the full save; ledger is existing so merge keeps gameplay.
  RETURN public.merge_game_state_referrals(v_slice, v_state);
END;
$$;

COMMENT ON FUNCTION public.apply_referral_ledger(UUID, JSONB) IS
  'Union-merge ledger projection into a game_state document.';

REVOKE ALL ON FUNCTION public.apply_referral_ledger(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_referral_ledger(UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_referral(
  p_invitee_id UUID,
  p_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_referrer_id UUID;
  v_existing public.referrals%ROWTYPE;
  v_inserted public.referrals%ROWTYPE;
  v_table_count INTEGER;
  v_json_count INTEGER;
  v_referrer_state JSONB;
  v_invitee_state JSONB;
  v_reason TEXT;
  v_slice JSONB;
  v_first UUID;
  v_second UUID;
BEGIN
  IF p_invitee_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'claim_error');
  END IF;

  v_code := NULLIF(btrim(COALESCE(p_code, '')), '');

  SELECT * INTO v_existing
  FROM public.referrals
  WHERE invitee_id = p_invitee_id;

  IF v_code IS NOT NULL AND v_existing.invitee_id IS NULL THEN
    IF v_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_referrer_id := v_code::uuid;
    ELSE
      v_code := upper(v_code);
      IF v_code !~ '^[A-Z2-9]{6}$' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_referral_code');
      END IF;
      SELECT user_id INTO v_referrer_id
      FROM public.referral_codes
      WHERE btrim(code::text) = v_code;
      IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'referrer_not_found');
      END IF;
    END IF;

    IF p_invitee_id = v_referrer_id THEN
      RETURN jsonb_build_object('success', false, 'reason', 'self_referral');
    END IF;

    -- Lock both saves in a stable order when both exist.
    IF p_invitee_id < v_referrer_id THEN
      v_first := p_invitee_id;
      v_second := v_referrer_id;
    ELSE
      v_first := v_referrer_id;
      v_second := p_invitee_id;
    END IF;

    PERFORM 1 FROM public.game_saves WHERE user_id = v_first FOR UPDATE;
    PERFORM 1 FROM public.game_saves WHERE user_id = v_second FOR UPDATE;

    SELECT game_state INTO v_referrer_state
    FROM public.game_saves
    WHERE user_id = v_referrer_id;

    SELECT COUNT(*) INTO v_table_count
    FROM public.referrals
    WHERE referrer_id = v_referrer_id;

    v_json_count := CASE
      WHEN jsonb_typeof(COALESCE(v_referrer_state->'referrals', '[]'::jsonb)) = 'array'
        THEN jsonb_array_length(v_referrer_state->'referrals')
      ELSE 0
    END;

    -- REFERRAL_LIMIT in shared/schema.ts
    IF GREATEST(v_table_count, v_json_count) >= 10 THEN
      RETURN jsonb_build_object('success', false, 'reason', 'referrer_limit_reached');
    END IF;

    INSERT INTO public.referrals (invitee_id, referrer_id, code)
    VALUES (p_invitee_id, v_referrer_id, v_code)
    ON CONFLICT (invitee_id) DO NOTHING
    RETURNING * INTO v_inserted;

    IF v_inserted.invitee_id IS NULL THEN
      v_reason := 'already_processed';
    ELSE
      v_reason := NULL;
    END IF;
  ELSIF v_existing.invitee_id IS NOT NULL THEN
    v_referrer_id := v_existing.referrer_id;
    v_code := v_existing.code;
    v_reason := 'already_processed';

    IF p_invitee_id < v_referrer_id THEN
      PERFORM 1 FROM public.game_saves WHERE user_id = p_invitee_id FOR UPDATE;
      PERFORM 1 FROM public.game_saves WHERE user_id = v_referrer_id FOR UPDATE;
    ELSE
      PERFORM 1 FROM public.game_saves WHERE user_id = v_referrer_id FOR UPDATE;
      PERFORM 1 FROM public.game_saves WHERE user_id = p_invitee_id FOR UPDATE;
    END IF;
  END IF;

  -- Project ledger onto existing saves only (never create a stub save).
  IF v_referrer_id IS NOT NULL THEN
    SELECT game_state INTO v_referrer_state
    FROM public.game_saves
    WHERE user_id = v_referrer_id;

    IF v_referrer_state IS NOT NULL THEN
      UPDATE public.game_saves
      SET
        game_state = public.apply_referral_ledger(v_referrer_id, game_state),
        updated_at = NOW()
      WHERE user_id = v_referrer_id;

      IF v_reason = 'already_processed' THEN
        IF NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(COALESCE(v_referrer_state->'referrals', '[]'::jsonb)) = 'array'
                THEN COALESCE(v_referrer_state->'referrals', '[]'::jsonb)
              ELSE '[]'::jsonb
            END
          ) e
          WHERE e->>'userId' = p_invitee_id::text
        ) THEN
          v_reason := 'referrer_repaired';
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT game_state INTO v_invitee_state
  FROM public.game_saves
  WHERE user_id = p_invitee_id
  FOR UPDATE;

  IF v_invitee_state IS NOT NULL THEN
    UPDATE public.game_saves
    SET
      game_state = public.apply_referral_ledger(p_invitee_id, game_state),
      updated_at = NOW()
    WHERE user_id = p_invitee_id;
  END IF;

  v_slice := public.referral_ledger_slice(p_invitee_id);

  RETURN jsonb_build_object(
    'success', true,
    'reason', v_reason,
    'referralProcessed', COALESCE((v_slice->>'referralProcessed')::boolean, false),
    'referralCode', v_slice->>'referralCode',
    'referrals', COALESCE(v_slice->'referrals', '[]'::jsonb),
    'referralCount', COALESCE((v_slice->>'referralCount')::integer, 0),
    'referredUsers', COALESCE(v_slice->'referredUsers', '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.claim_referral(UUID, TEXT) IS
  'Authenticated invite claim: insert referrals ledger row, project onto existing saves. Null code syncs the caller projection only.';

REVOKE ALL ON FUNCTION public.claim_referral(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral(UUID, TEXT) TO service_role;
