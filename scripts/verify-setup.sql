-- Database Setup Verification Script
-- Run this to verify all tables and policies are correctly configured

-- Check all tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('user_demographics', 'user_webcapture', 'user_sentiment', 'experiment_videos', 'admin_users')
ORDER BY table_name;

-- Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_demographics', 'user_webcapture', 'user_sentiment', 'experiment_videos', 'admin_users');

-- Check policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user_demographics', 'user_webcapture', 'user_sentiment')
ORDER BY tablename, indexname;

-- Check default experiment video exists
SELECT
  experiment_id,
  video_name,
  duration_seconds,
  is_active,
  created_at
FROM experiment_videos
WHERE is_active = true;

-- Check admin users
SELECT
  admin_id,
  email,
  created_at
FROM admin_users;

-- Check foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Sample data check (should be empty initially)
SELECT
  'user_demographics' as table_name,
  COUNT(*) as record_count
FROM user_demographics
UNION ALL
SELECT 'user_webcapture', COUNT(*) FROM user_webcapture
UNION ALL
SELECT 'user_sentiment', COUNT(*) FROM user_sentiment
UNION ALL
SELECT 'experiment_videos', COUNT(*) FROM experiment_videos
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users;
