-- Short 6-character invite codes (see shared/referralCode.ts).
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code CHAR(6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_codes_code_unique UNIQUE (code),
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[A-Z2-9]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes (code);

COMMENT ON TABLE public.referral_codes IS 'Per-user short invite codes for ?ref= links; resolved server-side only.';

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
