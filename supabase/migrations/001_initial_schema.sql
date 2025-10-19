-- Facial Sentiment Analysis MVP - Database Schema
-- Project: facial_sentiment (spylqvzwvcjuaqgthxhw)
-- Generated: 2025-10-15
-- Configuration: Rapid MVP with 90-day retention

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User demographics table
CREATE TABLE user_demographics (
  uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  age TEXT,
  gender TEXT,
  race TEXT,
  ethnicity TEXT,
  nationality TEXT,
  other_data JSONB,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  facial_analysis_consent BOOLEAN DEFAULT true,
  facial_analysis_consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retention_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

-- Create index on consent timestamp for filtering
CREATE INDEX idx_user_demographics_consent ON user_demographics(consent_timestamp);
CREATE INDEX idx_user_demographics_expiry ON user_demographics(retention_expires_at);

-- Experiment videos table
CREATE TABLE experiment_videos (
  experiment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_url TEXT NOT NULL,
  video_name TEXT,
  duration_seconds NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- User webcam captures table
CREATE TABLE user_webcapture (
  capture_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID REFERENCES user_demographics(uid) ON DELETE CASCADE,
  experiment_id UUID REFERENCES experiment_videos(experiment_id) ON DELETE SET NULL,
  video_path TEXT NOT NULL,
  video_url TEXT,
  duration_seconds NUMERIC,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webcapture_user ON user_webcapture(user_uid);
CREATE INDEX idx_webcapture_experiment ON user_webcapture(experiment_id);

-- User sentiment data table
CREATE TABLE user_sentiment (
  sentiment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  capture_id UUID REFERENCES user_webcapture(capture_id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC NOT NULL,
  emotions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sentiment_capture ON user_sentiment(capture_id);
CREATE INDEX idx_sentiment_timestamp ON user_sentiment(capture_id, timestamp_seconds);

-- Admin users table
CREATE TABLE admin_users (
  admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE user_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_webcapture ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin read policies
CREATE POLICY "Admins can view all demographics"
  ON user_demographics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all webcaptures"
  ON user_webcapture FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all sentiment data"
  ON user_sentiment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all experiments"
  ON experiment_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Insert default experiment video (Big Buck Bunny)
INSERT INTO experiment_videos (video_url, video_name, duration_seconds)
VALUES (
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'Big Buck Bunny (Sample)',
  596
);

-- Function to auto-delete expired data (90-day retention)
CREATE OR REPLACE FUNCTION delete_expired_demographics()
RETURNS void AS $$
BEGIN
  DELETE FROM user_demographics
  WHERE retention_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- Uncomment if pg_cron is enabled:
-- SELECT cron.schedule('delete-expired-data', '0 2 * * *', 'SELECT delete_expired_demographics()');

COMMENT ON TABLE user_demographics IS 'Participant demographic data with 90-day retention';
COMMENT ON TABLE user_webcapture IS 'Webcam video captures during experiments';
COMMENT ON TABLE user_sentiment IS 'Timestamped facial emotion analysis data';
COMMENT ON TABLE experiment_videos IS 'Experiment videos shown to participants';
COMMENT ON TABLE admin_users IS 'Admin users with dashboard access';
COMMENT ON COLUMN user_demographics.retention_expires_at IS 'Data automatically deleted after this date (90 days)';
