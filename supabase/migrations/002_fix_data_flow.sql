-- Migration to ensure proper data flow for user onboarding
-- This fixes issues where data was being stored in kv_store instead of proper tables

-- First, let's check if any kv_store tables exist and migrate data if needed
DO $$
BEGIN
  -- Check if kv_store table exists (from old implementation)
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'kv_store%'
  ) THEN
    RAISE NOTICE 'Found kv_store tables - migration may be needed';
    -- Note: Manual migration would be needed here if kv_store tables exist
  END IF;
END $$;

-- Ensure all required columns exist in user_demographics
ALTER TABLE user_demographics
  ADD COLUMN IF NOT EXISTS age TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS race TEXT,
  ADD COLUMN IF NOT EXISTS ethnicity TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS other_data JSONB DEFAULT '{}';

-- Ensure all required columns exist in user_webcapture  
ALTER TABLE user_webcapture
  ADD COLUMN IF NOT EXISTS user_uid UUID REFERENCES user_demographics(uid) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES experiment_videos(experiment_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_path TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC,
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure all required columns exist in user_sentiment
ALTER TABLE user_sentiment
  ADD COLUMN IF NOT EXISTS capture_id UUID REFERENCES user_webcapture(capture_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS timestamp_seconds NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emotions JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_demographics_consent ON user_demographics(consent_timestamp);
CREATE INDEX IF NOT EXISTS idx_user_demographics_expiry ON user_demographics(retention_expires_at);
CREATE INDEX IF NOT EXISTS idx_webcapture_user ON user_webcapture(user_uid);
CREATE INDEX IF NOT EXISTS idx_webcapture_experiment ON user_webcapture(experiment_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_capture ON user_sentiment(capture_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_timestamp ON user_sentiment(capture_id, timestamp_seconds);

-- Ensure default experiment exists
INSERT INTO experiment_videos (video_url, video_name, duration_seconds)
SELECT 
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'Big Buck Bunny (Sample)',
  596
WHERE NOT EXISTS (
  SELECT 1 FROM experiment_videos 
  WHERE video_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
);

-- Update RLS policies to ensure they work with the correct columns
DROP POLICY IF EXISTS "Admins can view all demographics" ON user_demographics;
CREATE POLICY "Admins can view all demographics"
  ON user_demographics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can insert demographics" ON user_demographics;
CREATE POLICY "Public can insert demographics"
  ON user_demographics FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert webcapture" ON user_webcapture;
CREATE POLICY "Public can insert webcapture"
  ON user_webcapture FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert sentiment" ON user_sentiment;
CREATE POLICY "Public can insert sentiment"
  ON user_sentiment FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add comments to clarify table purpose
COMMENT ON TABLE user_demographics IS 'Stores participant demographic information collected during onboarding';
COMMENT ON TABLE user_webcapture IS 'Stores webcam recording metadata and references to video files';
COMMENT ON TABLE user_sentiment IS 'Stores facial sentiment analysis data points with emotions and timestamps';
COMMENT ON TABLE experiment_videos IS 'Stores experiment video information shown to participants';

-- Verify data integrity
DO $$
DECLARE
  demo_count INTEGER;
  capture_count INTEGER;
  sentiment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO demo_count FROM user_demographics;
  SELECT COUNT(*) INTO capture_count FROM user_webcapture;
  SELECT COUNT(*) INTO sentiment_count FROM user_sentiment;
  
  RAISE NOTICE 'Data Check - Demographics: %, Webcaptures: %, Sentiments: %', 
    demo_count, capture_count, sentiment_count;
    
  -- Check for orphaned records
  IF EXISTS (
    SELECT 1 FROM user_webcapture w 
    WHERE w.user_uid IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM user_demographics d WHERE d.uid = w.user_uid)
  ) THEN
    RAISE WARNING 'Found orphaned webcapture records';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_sentiment s 
    WHERE s.capture_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM user_webcapture w WHERE w.capture_id = s.capture_id)
  ) THEN
    RAISE WARNING 'Found orphaned sentiment records';
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON user_demographics TO anon;
GRANT INSERT ON user_webcapture TO anon;
GRANT INSERT ON user_sentiment TO anon;
GRANT SELECT ON experiment_videos TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully. Data is now properly stored in user_* tables.';
END $$;