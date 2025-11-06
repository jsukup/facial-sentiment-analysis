-- Migration: Fix video durations and add validation columns
-- Purpose: Correct ForBigger video durations from 15s to 60s and add tracking columns
-- Timestamp: 2025-01-26

-- ===================================================
-- FIX INCORRECT VIDEO DURATIONS
-- ===================================================

-- Fix incorrect durations for ForBigger videos (they are 60 seconds, not 15)
UPDATE experiment_videos 
SET 
  duration_seconds = 60
WHERE video_name LIKE '%ForBigger%' 
  AND duration_seconds = 15;

-- ===================================================
-- ADD VALIDATION TRACKING COLUMNS
-- ===================================================

-- Add columns for tracking duration validation
ALTER TABLE experiment_videos 
ADD COLUMN IF NOT EXISTS duration_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_measured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_source TEXT DEFAULT 'manual' CHECK (duration_source IN ('manual', 'auto-detected', 'verified')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to indicate manual entry
UPDATE experiment_videos 
SET duration_source = 'manual'
WHERE duration_source IS NULL;

-- Mark corrected videos as verified since we know the actual durations
UPDATE experiment_videos 
SET 
  duration_verified = true,
  duration_source = 'verified',
  duration_measured_at = NOW(),
  updated_at = NOW()
WHERE video_name LIKE '%ForBigger%';

-- ===================================================
-- VERIFICATION AND LOGGING
-- ===================================================

DO $$
DECLARE
  updated_count INTEGER;
  total_videos INTEGER;
BEGIN
  -- Count how many videos were updated
  SELECT COUNT(*) INTO updated_count 
  FROM experiment_videos 
  WHERE video_name LIKE '%ForBigger%' 
    AND duration_seconds = 60;
  
  -- Count total videos
  SELECT COUNT(*) INTO total_videos FROM experiment_videos;
  
  RAISE NOTICE '=== Video Duration Fix Migration Complete ===';
  RAISE NOTICE 'Updated % ForBigger videos to 60 seconds', updated_count;
  RAISE NOTICE 'Total videos in database: %', total_videos;
  
  -- Verify the fix worked
  IF updated_count >= 5 THEN
    RAISE NOTICE '✅ Successfully corrected ForBigger video durations';
  ELSE
    RAISE WARNING '⚠️ Expected to update 5 ForBigger videos, but only updated %', updated_count;
  END IF;
END $$;

-- Show updated video inventory
DO $$
DECLARE
  video_record RECORD;
BEGIN
  RAISE NOTICE '=== Updated Video Inventory ===';
  
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

-- Add comment for future reference
COMMENT ON COLUMN experiment_videos.duration_verified IS 'Whether the duration has been verified against actual video file';
COMMENT ON COLUMN experiment_videos.duration_measured_at IS 'Timestamp when duration was last measured/verified';
COMMENT ON COLUMN experiment_videos.duration_source IS 'Source of duration data: manual (user entered), auto-detected (system measured), verified (confirmed accurate)';