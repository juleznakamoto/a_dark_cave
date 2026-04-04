-- Marketing consent (marketing_preferences) and one-time unsubscribe tokens
-- (marketing_unsubscribe_tokens). App server uses service role for writes; tokens
-- table has RLS enabled with no policies (service role only).

-- Marketing email consent (opt-in) per user
CREATE TABLE IF NOT EXISTS public.marketing_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  consent_source TEXT NOT NULL,
  consent_text_version INTEGER NOT NULL,
  prompt_version INTEGER NOT NULL,
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_preferences_opt_in
  ON public.marketing_preferences (marketing_opt_in);
CREATE INDEX IF NOT EXISTS idx_marketing_preferences_created
  ON public.marketing_preferences (created_at);

ALTER TABLE public.marketing_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own marketing preference" ON public.marketing_preferences;
DROP POLICY IF EXISTS "Users insert own marketing preference" ON public.marketing_preferences;
DROP POLICY IF EXISTS "Users update own marketing preference" ON public.marketing_preferences;

CREATE POLICY "Users read own marketing preference"
  ON public.marketing_preferences FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users insert own marketing preference"
  ON public.marketing_preferences FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users update own marketing preference"
  ON public.marketing_preferences FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- One-time tokens for unsubscribe links (hashed at rest)
CREATE TABLE IF NOT EXISTS public.marketing_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_unsub_tokens_hash
  ON public.marketing_unsubscribe_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_marketing_unsub_tokens_user
  ON public.marketing_unsubscribe_tokens (user_id);

-- RLS with no policies: anon/authenticated cannot access; service role bypasses RLS.
ALTER TABLE public.marketing_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
