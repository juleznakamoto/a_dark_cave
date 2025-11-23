
-- Add the missing updated_at column to button_clicks table
ALTER TABLE button_clicks 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
