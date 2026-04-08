-- Purchases: charge currency (eur|usd) + admin_purchase_metrics with separate EUR/USD totals (no FX).

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE purchases SET currency = 'eur' WHERE currency IS NULL;

ALTER TABLE purchases ALTER COLUMN currency SET DEFAULT 'eur';

ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_currency_check;
ALTER TABLE purchases
  ADD CONSTRAINT purchases_currency_check
  CHECK (LOWER(TRIM(currency)) IN ('eur', 'usd'));

ALTER TABLE purchases ALTER COLUMN currency SET NOT NULL;

COMMENT ON COLUMN purchases.currency IS 'Stripe charge currency (eur|usd). Admin metrics sum price_paid per currency; legacy rows assumed eur.';

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
       WHERE price_paid > 0 AND bundle_id IS NULL)
  );
$$;

REVOKE ALL ON FUNCTION public.admin_purchase_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purchase_metrics() TO service_role;
