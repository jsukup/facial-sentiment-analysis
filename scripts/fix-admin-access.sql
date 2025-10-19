-- Fix Admin Access Issues
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/sql/new

-- 1. Check if admin user exists and is linked
SELECT
  u.email,
  u.id as auth_user_id,
  u.email_confirmed_at,
  a.admin_id,
  a.email as admin_email
FROM auth.users u
LEFT JOIN admin_users a ON a.auth_user_id = u.id
WHERE u.email = 'john@expectedx.com';

-- Expected: Should show john@expectedx.com with matching admin_id
-- If admin_id is NULL, run step 2

-- 2. Link admin user (if needed)
INSERT INTO admin_users (email, auth_user_id)
SELECT email, id
FROM auth.users
WHERE email = 'john@expectedx.com'
  AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE auth_user_id = auth.users.id
  );

-- 3. Add RLS policy to allow users to check their own admin status
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can check their own admin status" ON admin_users;

-- Create new policy
CREATE POLICY "Users can check their own admin status"
ON admin_users
FOR SELECT
USING (auth_user_id = auth.uid());

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'admin_users';

-- Expected: rowsecurity should be true

-- 5. List all policies on admin_users
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'admin_users';

-- 6. Set/Reset password for admin user (CHANGE PASSWORD BELOW)
UPDATE auth.users
SET
  encrypted_password = crypt('Admin123!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  raw_app_meta_data = raw_app_meta_data || '{"provider":"email","providers":["email"]}'::jsonb
WHERE email = 'john@expectedx.com';

-- IMPORTANT: Change 'Admin123!' to your desired password above

-- 7. Verify everything is set up correctly
SELECT
  u.email,
  u.id as auth_user_id,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.encrypted_password IS NOT NULL as password_set,
  a.admin_id IS NOT NULL as is_admin
FROM auth.users u
LEFT JOIN admin_users a ON a.auth_user_id = u.id
WHERE u.email = 'john@expectedx.com';

-- Expected all TRUE values:
-- email_confirmed: t
-- password_set: t
-- is_admin: t
