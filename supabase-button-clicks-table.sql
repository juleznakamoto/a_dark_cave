
-- Create the button_clicks table for analytics
CREATE TABLE IF NOT EXISTS button_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  clicks JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE button_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies (only service role can write for analytics integrity)
CREATE POLICY "Users can view their own click data"
  ON button_clicks FOR SELECT
  USING (auth.uid() = user_id);

-- Service role only for inserts to prevent tampering
CREATE POLICY "Service role can insert click data"
  ON button_clicks FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS button_clicks_user_id_idx ON button_clicks(user_id);
CREATE INDEX IF NOT EXISTS button_clicks_timestamp_idx ON button_clicks(timestamp);
