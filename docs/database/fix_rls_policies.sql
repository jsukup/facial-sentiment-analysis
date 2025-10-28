-- Fix RLS policies for sentiment data insertion
-- This addresses the issue where sentiment data cannot be inserted due to RLS violations

-- Ensure RLS is enabled on user_sentiment table
ALTER TABLE user_sentiment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can insert sentiment" ON user_sentiment;
DROP POLICY IF EXISTS "Authenticated users can insert sentiment" ON user_sentiment;
DROP POLICY IF EXISTS "Anonymous users can insert sentiment" ON user_sentiment;

-- Create policy allowing anonymous users to insert sentiment data
-- This is needed for the frontend application to submit sentiment data
CREATE POLICY "Anonymous users can insert sentiment"
  ON user_sentiment FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy allowing authenticated users to insert sentiment data  
-- This ensures backend services can also insert data
CREATE POLICY "Authenticated users can insert sentiment"
  ON user_sentiment FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant necessary permissions to anon role
GRANT INSERT ON user_sentiment TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant necessary permissions to authenticated role
GRANT INSERT ON user_sentiment TO authenticated;
GRANT SELECT ON user_sentiment TO authenticated;

-- Verify the policies are in place
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been applied to user_sentiment table';
  RAISE NOTICE 'Anonymous and authenticated users can now insert sentiment data';
END $$;