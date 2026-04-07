-- Accurate all-time purchase totals for admin dashboard (bypasses PostgREST row limits).
-- Matches client filter: paid rows only, exclude bundle component lines (bundle_id IS NOT NULL).

CREATE OR REPLACE FUNCTION public.admin_purchase_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_revenue_cents',
      COALESCE(
        (SELECT SUM(price_paid)::bigint
         FROM purchases
         WHERE price_paid > 0 AND bundle_id IS NULL),
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
