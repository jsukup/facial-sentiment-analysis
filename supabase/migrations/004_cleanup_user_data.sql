-- Migration: Clean out all existing user data
-- This migration safely removes all user data while preserving table structure
-- Timestamp: 2025-01-25

-- Safe User Data Cleanup Script
-- This script safely removes all user data from Supabase while preserving table structure
-- and respecting foreign key constraints

-- ===================================================
-- SAFETY CHECKS AND PRELIMINARY ANALYSIS
-- ===================================================

-- First, let's examine what data currently exists
-- This provides a snapshot before cleanup
DO $$
DECLARE
    demographics_count INTEGER;
    webcapture_count INTEGER;
    sentiment_count INTEGER;
    experiment_count INTEGER;
    admin_count INTEGER;
BEGIN
    -- Count existing records
    SELECT COUNT(*) INTO demographics_count FROM user_demographics;
    SELECT COUNT(*) INTO webcapture_count FROM user_webcapture;
    SELECT COUNT(*) INTO sentiment_count FROM user_sentiment;
    SELECT COUNT(*) INTO experiment_count FROM experiment_videos;
    SELECT COUNT(*) INTO admin_count FROM admin_users;
    
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'PRE-CLEANUP DATA ANALYSIS';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Current data counts:';
    RAISE NOTICE '- user_demographics: % records', demographics_count;
    RAISE NOTICE '- user_webcapture: % records', webcapture_count;
    RAISE NOTICE '- user_sentiment: % records', sentiment_count;
    RAISE NOTICE '- experiment_videos: % records', experiment_count;
    RAISE NOTICE '- admin_users: % records', admin_count;
    RAISE NOTICE '===============================================';
    
    -- Check for orphaned records before cleanup
    IF EXISTS (
        SELECT 1 FROM user_webcapture w 
        WHERE w.user_uid IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM user_demographics d WHERE d.uid = w.user_uid)
    ) THEN
        RAISE WARNING 'Found orphaned webcapture records (no matching demographics)';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM user_sentiment s 
        WHERE s.capture_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM user_webcapture w WHERE w.capture_id = s.capture_id)
    ) THEN
        RAISE WARNING 'Found orphaned sentiment records (no matching webcapture)';
    END IF;
END $$;

-- ===================================================
-- SAFE DELETION PLAN
-- ===================================================

-- Based on the schema analysis:
-- 1. user_sentiment references user_webcapture.capture_id (ON DELETE CASCADE)
-- 2. user_webcapture references user_demographics.uid (ON DELETE CASCADE)
-- 3. experiment_videos is referenced by user_webcapture but doesn't need deletion
-- 4. admin_users should be preserved

-- The correct deletion order respecting foreign key constraints:
-- 1. Delete user_sentiment (leaf table)
-- 2. Delete user_webcapture (middle table)  
-- 3. Delete user_demographics (root table)

-- ===================================================
-- STEP 1: DELETE USER SENTIMENT DATA
-- ===================================================

DO $$
DECLARE
    deleted_sentiment_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 1: Deleting user sentiment data...';
    
    -- Delete all sentiment analysis data
    DELETE FROM user_sentiment;
    GET DIAGNOSTICS deleted_sentiment_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % user_sentiment records', deleted_sentiment_count;
END $$;

-- ===================================================
-- STEP 2: DELETE USER WEBCAPTURE DATA
-- ===================================================

DO $$
DECLARE
    deleted_webcapture_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 2: Deleting user webcapture data...';
    
    -- Delete all webcam capture records
    DELETE FROM user_webcapture;
    GET DIAGNOSTICS deleted_webcapture_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % user_webcapture records', deleted_webcapture_count;
END $$;

-- ===================================================
-- STEP 3: DELETE USER DEMOGRAPHICS DATA
-- ===================================================

DO $$
DECLARE
    deleted_demographics_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 3: Deleting user demographics data...';
    
    -- Delete all demographic records
    DELETE FROM user_demographics;
    GET DIAGNOSTICS deleted_demographics_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % user_demographics records', deleted_demographics_count;
END $$;

-- ===================================================
-- POST-CLEANUP VERIFICATION
-- ===================================================

DO $$
DECLARE
    demographics_count INTEGER;
    webcapture_count INTEGER;
    sentiment_count INTEGER;
    experiment_count INTEGER;
    admin_count INTEGER;
BEGIN
    -- Verify all user data has been removed
    SELECT COUNT(*) INTO demographics_count FROM user_demographics;
    SELECT COUNT(*) INTO webcapture_count FROM user_webcapture;
    SELECT COUNT(*) INTO sentiment_count FROM user_sentiment;
    SELECT COUNT(*) INTO experiment_count FROM experiment_videos;
    SELECT COUNT(*) INTO admin_count FROM admin_users;
    
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'POST-CLEANUP VERIFICATION';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Remaining data counts:';
    RAISE NOTICE '- user_demographics: % records', demographics_count;
    RAISE NOTICE '- user_webcapture: % records', webcapture_count;
    RAISE NOTICE '- user_sentiment: % records', sentiment_count;
    RAISE NOTICE '- experiment_videos: % records (preserved)', experiment_count;
    RAISE NOTICE '- admin_users: % records (preserved)', admin_count;
    
    -- Validate cleanup was successful
    IF demographics_count = 0 AND webcapture_count = 0 AND sentiment_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All user data has been safely removed!';
    ELSE
        RAISE WARNING 'INCOMPLETE: Some user data may remain. Please investigate.';
    END IF;
    
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'TABLE STRUCTURE VERIFICATION';
    RAISE NOTICE '===============================================';
    
    -- Verify table structure is intact
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_demographics') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_webcapture') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sentiment') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'experiment_videos') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        RAISE NOTICE 'SUCCESS: All table structures are intact and ready for new data';
    ELSE
        RAISE WARNING 'ERROR: Some table structures may be missing. Please check schema.';
    END IF;
    
    RAISE NOTICE '===============================================';
END $$;

-- ===================================================
-- RESET AUTO-INCREMENT SEQUENCES (if applicable)
-- ===================================================

-- Note: This database uses UUIDs, not auto-increment integers,
-- so no sequence reset is needed. UUIDs are always unique.

-- ===================================================
-- OPTIONAL: VACUUM AND ANALYZE
-- ===================================================

-- Note: VACUUM commands removed as they cannot be executed within migration pipelines
-- These can be run manually if needed:
-- VACUUM ANALYZE user_demographics;
-- VACUUM ANALYZE user_webcapture;
-- VACUUM ANALYZE user_sentiment;

-- ===================================================
-- COMPLETION SUMMARY
-- ===================================================

DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'USER DATA CLEANUP COMPLETED';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '✓ All user demographic data removed';
    RAISE NOTICE '✓ All webcam capture data removed';
    RAISE NOTICE '✓ All sentiment analysis data removed';
    RAISE NOTICE '✓ Table structures preserved';
    RAISE NOTICE '✓ Foreign key constraints respected';
    RAISE NOTICE '✓ Admin users preserved';
    RAISE NOTICE '✓ Experiment videos preserved';
    RAISE NOTICE '✓ Database ready for new user sessions';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '- The application is ready to accept new participants';
    RAISE NOTICE '- All table structures and constraints are intact';
    RAISE NOTICE '- Consider running application tests to verify functionality';
    RAISE NOTICE '===============================================';
END $$;