-- Migration: Fix ForBigger video durations - second attempt
-- Purpose: Correct ForBigger video durations from 15s to 60s using exact video names
-- Timestamp: 2025-01-26

-- Fix video durations using exact patterns that match database
UPDATE experiment_videos 
SET 
  duration_seconds = 60,
  duration_verified = true,
  duration_source = 'verified',
  duration_measured_at = NOW(),
  updated_at = NOW()
WHERE video_name IN (
  'For Bigger Blazes (Short)',
  'For Bigger Meltdowns (Short)',
  'For Bigger Escapes (Short)',
  'For Bigger Joyrides (Short)',
  'For Bigger Fun (Short)'
) AND duration_seconds = 15;

-- Verification
DO $$
DECLARE
  updated_count INTEGER;
  remaining_15s INTEGER;
BEGIN
  -- Count how many ForBigger videos were updated to 60s
  SELECT COUNT(*) INTO updated_count 
  FROM experiment_videos 
  WHERE video_name LIKE '%For Bigger%' 
    AND duration_seconds = 60;
  
  -- Count how many are still at 15s
  SELECT COUNT(*) INTO remaining_15s
  FROM experiment_videos 
  WHERE video_name LIKE '%For Bigger%' 
    AND duration_seconds = 15;
  
  RAISE NOTICE '=== ForBigger Video Duration Fix ===';
  RAISE NOTICE 'Videos updated to 60s: %', updated_count;
  RAISE NOTICE 'Videos remaining at 15s: %', remaining_15s;
  
  IF updated_count >= 5 THEN
    RAISE NOTICE '✅ Successfully corrected ForBigger video durations';
  ELSE
    RAISE NOTICE '⚠️ Only updated % videos instead of expected 5', updated_count;
  END IF;
END $$;

-- Show all videos with their durations
DO $$
DECLARE
  video_record RECORD;
BEGIN
  RAISE NOTICE '=== All Video Durations ===';
  
  FOR video_record IN 
    SELECT video_name, duration_seconds, duration_verified, duration_source
    FROM experiment_videos 
    ORDER BY duration_seconds ASC
  LOOP
    RAISE NOTICE '📹 % | %s | Verified: % | Source: %', 
      video_record.video_name,
      video_record.duration_seconds,
      video_record.duration_verified,
      video_record.duration_source;
  END LOOP;
END $$;