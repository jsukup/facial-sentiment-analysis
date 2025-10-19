-- Setup Admin User: john@expectedx.com
-- Run this script in Supabase SQL Editor AFTER creating the auth user

-- Step 1: First, create the auth user in Supabase Dashboard
-- Go to: Authentication > Users > Add User
-- Email: john@expectedx.com
-- Password: [Set a strong password]
-- Auto Confirm: Yes

-- Step 2: Run this SQL to add to admin_users table
INSERT INTO admin_users (email, auth_user_id)
SELECT
  'john@expectedx.com',
  id
FROM auth.users
WHERE email = 'john@expectedx.com'
ON CONFLICT (email) DO NOTHING;

-- Verify admin user was created
SELECT
  au.admin_id,
  au.email,
  au.created_at,
  u.email as auth_email,
  u.email_confirmed_at
FROM admin_users au
JOIN auth.users u ON au.auth_user_id = u.id
WHERE au.email = 'john@expectedx.com';
