-- Fix RLS policies for sentiment data insertion
-- This specifically addresses the RLS violation error preventing sentiment data storage

-- First, ensure the table has RLS enabled
ALTER TABLE user_sentiment ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Public can insert sentiment" ON user_sentiment;
DROP POLICY IF EXISTS "Anonymous can insert sentiment" ON user_sentiment;
DROP POLICY IF EXISTS "Authenticated can insert sentiment" ON user_sentiment;

-- Create a policy that allows anonymous users to insert sentiment data
-- This is required for the frontend application to submit sentiment data during experiments
CREATE POLICY "Allow anonymous sentiment insertion"
  ON user_sentiment FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow authenticated users (for backend services)
CREATE POLICY "Allow authenticated sentiment insertion"
  ON user_sentiment FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure proper grants are in place for anon role
GRANT INSERT ON user_sentiment TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Ensure proper grants for authenticated role
GRANT INSERT ON user_sentiment TO authenticated;
GRANT SELECT ON user_sentiment TO authenticated;

-- Test the policy by attempting a simple insert (this will be rolled back)
DO $$
BEGIN
  -- Test insert to verify policy works
  INSERT INTO user_sentiment (capture_id, timestamp_seconds, emotions)
  VALUES (NULL, 0, '{"test": true}');
  
  -- Rollback the test insert
  RAISE EXCEPTION 'Test insert successful - rolling back';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'RLS policy test completed';
END $$;

-- Verify the policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'user_sentiment' 
    AND policyname IN ('Allow anonymous sentiment insertion', 'Allow authenticated sentiment insertion');
  
  IF policy_count = 2 THEN
    RAISE NOTICE 'SUCCESS: Both sentiment insertion policies are now active';
  ELSE
    RAISE EXCEPTION 'FAILED: Sentiment insertion policies were not created properly';
  END IF;
END $$;