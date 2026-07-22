-- Remove unused admin churn-rate-over-time RPC (chart/endpoint removed).

DROP FUNCTION IF EXISTS public.admin_churn_rate_over_time(integer, integer);
