-- Idempotent fulfillment: one purchases row per Stripe PaymentIntent (parent / paid lines only).
-- Stripe FX Quotes (preview): optional reporting_eur_cents + reporting_usd_cents at purchase time.

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS stripe_fx_quote_id TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS reporting_eur_cents INTEGER;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS reporting_usd_cents INTEGER;

COMMENT ON COLUMN purchases.stripe_payment_intent_id IS 'Stripe PaymentIntent id (pi_...); set on paid parent rows for idempotent /api/payment/verify.';
COMMENT ON COLUMN purchases.stripe_fx_quote_id IS 'Stripe FX Quote id (fxq_...) when dual-currency reporting amounts were computed.';
COMMENT ON COLUMN purchases.reporting_eur_cents IS 'Purchase amount in EUR minor units using Stripe FX Quotes at purchase time (nullable if FX unavailable).';
COMMENT ON COLUMN purchases.reporting_usd_cents IS 'Purchase amount in USD minor units using Stripe FX Quotes at purchase time (nullable if FX unavailable).';

DROP INDEX IF EXISTS purchases_stripe_payment_intent_id_unique;
CREATE UNIQUE INDEX purchases_stripe_payment_intent_id_unique
  ON purchases (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Optional combined totals (COALESCE: legacy rows use charge currency only on their native side).
CREATE OR REPLACE FUNCTION public.admin_purchase_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_revenue_eur_cents',
      COALESCE(
        (SELECT SUM(price_paid)::bigint
         FROM purchases
         WHERE price_paid > 0
           AND bundle_id IS NULL
           AND LOWER(TRIM(currency)) = 'eur'),
        0
      ),
    'total_revenue_usd_cents',
      COALESCE(
        (SELECT SUM(price_paid)::bigint
         FROM purchases
         WHERE price_paid > 0
           AND bundle_id IS NULL
           AND LOWER(TRIM(currency)) = 'usd'),
        0
      ),
    'paid_buyer_count',
      (SELECT COUNT(DISTINCT user_id)::bigint
       FROM purchases
       WHERE price_paid > 0 AND bundle_id IS NULL),
    'total_reporting_eur_cents',
      COALESCE(
        (SELECT SUM(
           COALESCE(
             reporting_eur_cents,
             CASE WHEN LOWER(TRIM(currency)) = 'eur' THEN price_paid ELSE 0 END
           )
         )::bigint
         FROM purchases
         WHERE price_paid > 0 AND bundle_id IS NULL),
        0
      ),
    'total_reporting_usd_cents',
      COALESCE(
        (SELECT SUM(
           COALESCE(
             reporting_usd_cents,
             CASE WHEN LOWER(TRIM(currency)) = 'usd' THEN price_paid ELSE 0 END
           )
         )::bigint
         FROM purchases
         WHERE price_paid > 0 AND bundle_id IS NULL),
        0
      )
  );
$$;

REVOKE ALL ON FUNCTION public.admin_purchase_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purchase_metrics() TO service_role;
