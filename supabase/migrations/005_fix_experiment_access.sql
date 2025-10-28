-- Migration: Fix anonymous access to experiment_videos table
-- This migration adds the missing RLS policy to allow anonymous users to read experiment videos
-- Timestamp: 2025-01-25

-- ===================================================
-- PROBLEM ANALYSIS
-- ===================================================
-- Issue: experiment_id field not being populated in user_webcapture table
-- Root Cause: Anonymous users cannot read experiment_videos due to missing RLS policy
-- Solution: Add public read policy for experiment_videos table

-- ===================================================
-- VERIFY CURRENT STATE
-- ===================================================
DO $$
DECLARE
    experiment_count INTEGER;
    policy_exists BOOLEAN := FALSE;
BEGIN
    -- Check current experiment count
    SELECT COUNT(*) INTO experiment_count FROM experiment_videos;
    RAISE NOTICE 'Current experiment_videos count: %', experiment_count;
    
    -- Check if public read policy already exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'experiment_videos' 
        AND policyname = 'Public can view experiments'
    ) INTO policy_exists;
    
    RAISE NOTICE 'Public read policy exists: %', policy_exists;
END $$;

-- ===================================================
-- CREATE PUBLIC READ POLICY FOR EXPERIMENT_VIDEOS
-- ===================================================

-- Allow anonymous users to read experiment videos
-- This is necessary for the frontend to fetch experiment_id for user_webcapture records
CREATE POLICY "Public can view experiments"
  ON experiment_videos FOR SELECT
  TO anon
  USING (true);

-- Grant SELECT permission explicitly (should already exist from previous migration)
GRANT SELECT ON experiment_videos TO anon;

-- ===================================================
-- ENSURE DEFAULT EXPERIMENT EXISTS
-- ===================================================

-- Re-insert default experiment if it doesn't exist
-- This ensures there's always at least one experiment available
INSERT INTO experiment_videos (video_url, video_name, duration_seconds, is_active)
SELECT 
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'Big Buck Bunny (Sample)',
  596,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM experiment_videos 
  WHERE video_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
);

-- ===================================================
-- VERIFICATION
-- ===================================================

DO $$
DECLARE
    final_experiment_count INTEGER;
    has_active_experiments INTEGER;
    policy_check BOOLEAN := FALSE;
BEGIN
    -- Verify experiment count
    SELECT COUNT(*) INTO final_experiment_count FROM experiment_videos;
    RAISE NOTICE 'Final experiment_videos count: %', final_experiment_count;
    
    -- Verify active experiments
    SELECT COUNT(*) INTO has_active_experiments FROM experiment_videos WHERE is_active = true;
    RAISE NOTICE 'Active experiments count: %', has_active_experiments;
    
    -- Verify policy was created
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'experiment_videos' 
        AND policyname = 'Public can view experiments'
        AND roles = '{anon}'
    ) INTO policy_check;
    
    RAISE NOTICE 'Public read policy created successfully: %', policy_check;
    
    -- Summary
    IF final_experiment_count > 0 AND has_active_experiments > 0 AND policy_check THEN
        RAISE NOTICE '✅ SUCCESS: Anonymous users can now access experiment data';
        RAISE NOTICE '✅ experiment_id should now be populated in user_webcapture records';
    ELSE
        RAISE WARNING '❌ ISSUES REMAIN: Check experiment data or policy creation';
    END IF;
END $$;

-- ===================================================
-- ADD HELPFUL COMMENTS
-- ===================================================

COMMENT ON POLICY "Public can view experiments" ON experiment_videos IS 
  'Allows anonymous users to read experiment videos for webcam capture functionality';

-- ===================================================
-- SUCCESS MESSAGE
-- ===================================================

DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'EXPERIMENT ACCESS FIX COMPLETED';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '✅ Anonymous users can now read experiment_videos';
    RAISE NOTICE '✅ Default experiment data is available';
    RAISE NOTICE '✅ experiment_id should be populated in user_webcapture';
    RAISE NOTICE '===============================================';
END $$;