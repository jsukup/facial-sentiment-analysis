-- Migration: Add multiple experiment videos for user selection
-- Adds additional Google test videos with focus on shorter durations
-- Timestamp: 2025-01-25

-- ===================================================
-- ADD MULTIPLE EXPERIMENT VIDEOS
-- ===================================================

-- Insert additional experiment videos from Google test video collection
-- Focus on shorter videos (under 5 minutes) for better user experience
-- Insert videos only if they don't already exist
INSERT INTO experiment_videos (video_url, video_name, duration_seconds, is_active)
SELECT * FROM (
  VALUES 
    -- Short promotional videos (~15 seconds each)
    ('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'For Bigger Fun (Short)', 15, true),
    ('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'For Bigger Escapes (Short)', 15, true),
    ('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'For Bigger Blazes (Short)', 15, true),
    ('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'For Bigger Joyrides (Short)', 15, true),
    ('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'For Bigger Meltdowns (Short)', 15, true)
) AS new_videos(video_url, video_name, duration_seconds, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM experiment_videos WHERE experiment_videos.video_url = new_videos.video_url
); -- Prevent duplicates if migration runs multiple times

-- ===================================================
-- UPDATE EXISTING BIG BUCK BUNNY RECORD
-- ===================================================

-- Update the existing Big Buck Bunny record to have a clearer name
UPDATE experiment_videos 
SET video_name = 'Big Buck Bunny (Long - 10 min)'
WHERE video_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  AND video_name = 'Big Buck Bunny (Sample)';

-- ===================================================
-- VERIFICATION AND LOGGING
-- ===================================================

DO $$
DECLARE
    total_videos INTEGER;
    active_videos INTEGER;
    short_videos INTEGER;
BEGIN
    -- Count total videos
    SELECT COUNT(*) INTO total_videos FROM experiment_videos;
    
    -- Count active videos
    SELECT COUNT(*) INTO active_videos FROM experiment_videos WHERE is_active = true;
    
    -- Count short videos (under 1 minute)
    SELECT COUNT(*) INTO short_videos FROM experiment_videos WHERE duration_seconds < 60;
    
    RAISE NOTICE '=== Multiple Experiment Videos Migration Complete ===';
    RAISE NOTICE 'Total experiment videos: %', total_videos;
    RAISE NOTICE 'Active experiment videos: %', active_videos;
    RAISE NOTICE 'Short videos (< 60s): %', short_videos;
    
    -- Validate we have the expected videos
    IF total_videos >= 6 THEN
        RAISE NOTICE '✅ Successfully added multiple experiment videos';
    ELSE
        RAISE WARNING '⚠️ Expected at least 6 videos, found %', total_videos;
    END IF;
    
    IF short_videos >= 5 THEN
        RAISE NOTICE '✅ Successfully added short video options';
    ELSE
        RAISE WARNING '⚠️ Expected at least 5 short videos, found %', short_videos;
    END IF;
END $$;

-- ===================================================
-- DISPLAY CURRENT VIDEO INVENTORY
-- ===================================================

-- Show all available videos for verification
DO $$
DECLARE
    video_record RECORD;
BEGIN
    RAISE NOTICE '=== Current Video Inventory ===';
    
    FOR video_record IN 
        SELECT video_name, duration_seconds, is_active, video_url
        FROM experiment_videos 
        ORDER BY duration_seconds ASC
    LOOP
        RAISE NOTICE '📹 % | %s | Active: % | URL: %', 
            video_record.video_name,
            video_record.duration_seconds,
            video_record.is_active,
            substring(video_record.video_url from 1 for 50) || '...';
    END LOOP;
END $$;

-- Add helpful comment for future reference
COMMENT ON TABLE experiment_videos IS 'Experiment videos available for participant selection. Mix of short (15s) and long (10m) videos for different research needs.';