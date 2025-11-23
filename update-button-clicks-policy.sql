
-- Drop the old service role policy
DROP POLICY IF EXISTS "Service role can insert click data" ON button_clicks;

-- Create new policy allowing authenticated users to insert their own data
CREATE POLICY "Users can insert their own click data"
  ON button_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
