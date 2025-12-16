
-- Create table to track Daily Active Users
CREATE TABLE IF NOT EXISTS daily_active_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  active_user_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS idx_dau_date ON daily_active_users (date DESC);

-- Enable RLS (read-only for public)
ALTER TABLE daily_active_users ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to view DAU data
CREATE POLICY "Anyone can view DAU" ON daily_active_users FOR SELECT USING (true);

-- Create function to calculate and store DAU
CREATE OR REPLACE FUNCTION calculate_daily_active_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE;
  v_active_count INTEGER;
BEGIN
  -- Calculate for today (since we run this at the end of each day)
  v_today := CURRENT_DATE;
  
  -- Count unique users who had activity today
  -- Activity is defined as having updated_at within today's date range
  SELECT COUNT(DISTINCT user_id)
  INTO v_active_count
  FROM game_saves
  WHERE DATE(updated_at) = v_today;
  
  -- Insert or update the DAU record for today
  INSERT INTO daily_active_users (date, active_user_count)
  VALUES (v_today, v_active_count)
  ON CONFLICT (date)
  DO UPDATE SET
    active_user_count = EXCLUDED.active_user_count,
    created_at = NOW();
    
  RAISE NOTICE 'DAU calculated for %: % active users', v_today, v_active_count;
END;
$$;

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run daily at 11:59 PM UTC (end of day)
-- This calculates the DAU for the day that just ended
SELECT cron.schedule(
  'calculate-dau-daily',
  '59 23 * * *',
  'SELECT calculate_daily_active_users();'
);

-- Optional: Run once now to populate today's data
SELECT calculate_daily_active_users();

-- Add comment
COMMENT ON TABLE daily_active_users IS 'Tracks the number of daily active users based on game_saves.updated_at';
COMMENT ON FUNCTION calculate_daily_active_users IS 'Calculates DAU for the current day by counting unique users with updated_at activity';
