-- Admin dashboard: single EUR total for all charges (Stripe FX reporting_eur when set; else USD at fixed rate).
-- Rate must match shared/purchaseRevenueEur.ts ADMIN_HISTORICAL_USD_PER_EUR.

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
      ),
    'total_revenue_eur_unified_cents',
      COALESCE(
        (SELECT SUM(
           COALESCE(
             reporting_eur_cents::bigint,
             CASE
               WHEN LOWER(TRIM(currency)) = 'eur' THEN price_paid::bigint
               WHEN LOWER(TRIM(currency)) = 'usd' THEN (ROUND(price_paid::numeric / 1.09))::bigint
               ELSE price_paid::bigint
             END
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
