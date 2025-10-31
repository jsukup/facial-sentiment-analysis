#!/bin/bash

# Test upload with duration to verify if the fix is deployed
echo "🧪 TESTING LIVE DURATION UPLOAD"
echo "==============================="

# Create test data
TEST_USER_ID="test-user-$(date +%s)"
TEST_DURATION="25.75"

echo "User ID: $TEST_USER_ID"
echo "Duration: $TEST_DURATION"

# Create a small test video file
echo "Creating test video file..."
echo "fake video data" > test_video.webm

echo ""
echo "📤 Uploading to live server..."

# Upload to the live Supabase Edge Function
curl -X POST \
  "https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/server/upload-webcam" \
  -F "video=@test_video.webm" \
  -F "userId=$TEST_USER_ID" \
  -F "duration=$TEST_DURATION" \
  -v

echo ""
echo ""
echo "🔍 Testing duration analytics endpoint..."

# Test if the duration analytics endpoint exists (should need auth)
curl -X GET \
  "https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/server/duration-analytics" \
  -H "Authorization: Bearer dummy" \
  -v

# Clean up
rm -f test_video.webm

echo ""
echo "🏁 Test completed!"
echo ""
echo "Expected results:"
echo "✅ Upload should succeed with capture_id returned"
echo "✅ Analytics endpoint should respond (401 auth error expected)"
echo "✅ Server logs should show duration validation and verification"