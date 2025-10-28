-- Temporarily disable RLS on user_sentiment to test if that's the issue
-- This is a diagnostic step to confirm RLS is the problem

-- Disable RLS on user_sentiment table
ALTER TABLE user_sentiment DISABLE ROW LEVEL SECURITY;

-- Add a comment explaining this is temporary
COMMENT ON TABLE user_sentiment IS 'RLS temporarily disabled for debugging - should be re-enabled with proper policies';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'RLS has been DISABLED on user_sentiment table for debugging';
  RAISE NOTICE 'This should allow both anonymous and authenticated users to insert data';
  RAISE NOTICE 'Remember to re-enable RLS with proper policies once the issue is identified';
END $$;