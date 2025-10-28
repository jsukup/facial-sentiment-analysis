-- Fix RLS policies for user_sentiment table to allow anonymous inserts
-- This needs to be run in Supabase SQL Editor with admin privileges

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_sentiment';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all sentiment data" ON user_sentiment;
DROP POLICY IF EXISTS "Anonymous users can insert sentiment" ON user_sentiment;
DROP POLICY IF EXISTS "Authenticated users can insert sentiment" ON user_sentiment;
DROP POLICY IF EXISTS "Public can insert sentiment" ON user_sentiment;

-- Create new permissive policies for anonymous users
-- Allow anonymous users to INSERT sentiment data
CREATE POLICY "Enable anonymous insert for user_sentiment"
ON user_sentiment FOR INSERT
TO anon
WITH CHECK (true);

-- Allow service role to do everything (for backend operations)
CREATE POLICY "Service role full access to user_sentiment"
ON user_sentiment FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated admins to SELECT (view) sentiment data  
CREATE POLICY "Admins can view all sentiment data"
ON user_sentiment FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.auth_user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT INSERT ON user_sentiment TO anon;
GRANT ALL ON user_sentiment TO service_role;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'user_sentiment';