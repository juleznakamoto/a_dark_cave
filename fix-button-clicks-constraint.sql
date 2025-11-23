
-- Add unique constraint to button_clicks table if it doesn't exist
DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'button_clicks_user_id_key'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE button_clicks 
        ADD CONSTRAINT button_clicks_user_id_key UNIQUE (user_id);
    END IF;
END $$;
