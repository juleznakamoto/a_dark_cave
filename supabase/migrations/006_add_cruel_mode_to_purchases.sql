-- Add cruel_mode column to track whether purchase was made during cruel mode game
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cruel_mode BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN purchases.cruel_mode IS 'True if purchase was made while player was in cruel mode, false for normal mode, NULL for legacy/unknown';
