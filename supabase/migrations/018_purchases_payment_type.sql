-- Stripe payment method summary for admin analytics (e.g. card:visa, link).
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_type TEXT;

COMMENT ON COLUMN purchases.payment_type IS 'From Stripe Charge.payment_method_details (e.g. card:visa, paypal); null for legacy rows.';
