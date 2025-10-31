#!/bin/bash

# Script to generate dummy sentiment data for testing
# This script uses curl to directly insert data via the Supabase API

echo "🎬 Generating dummy sentiment data for testing..."
echo ""
echo "This script requires:"
echo "1. VITE_PUBLIC_SUPABASE_URL - Your Supabase project URL"
echo "2. SUPABASE_SERVICE_KEY - Your Supabase service key (for admin operations)"
echo ""

# Check if environment variables are set
if [ -z "$VITE_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Missing required environment variables!"
    echo ""
    echo "Please set:"
    echo "export VITE_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'"
    echo "export SUPABASE_SERVICE_KEY='your-service-key'"
    exit 1
fi

# Generate a sample user with sentiment data
generate_user_data() {
    local user_id=$1
    local age=$2
    local gender=$3
    
    # Generate sentiment data (simplified version)
    local sentiment_data='[
        {"timestamp": 0, "expressions": {"neutral": 0.5, "happy": 0.2, "sad": 0.1, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.05}},
        {"timestamp": 2, "expressions": {"neutral": 0.4, "happy": 0.3, "sad": 0.1, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.05}},
        {"timestamp": 4, "expressions": {"neutral": 0.45, "happy": 0.25, "sad": 0.1, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.05}},
        {"timestamp": 6, "expressions": {"neutral": 0.4, "happy": 0.2, "sad": 0.15, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.1}},
        {"timestamp": 8, "expressions": {"neutral": 0.35, "happy": 0.25, "sad": 0.1, "angry": 0.1, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.1}},
        {"timestamp": 10, "expressions": {"neutral": 0.4, "happy": 0.3, "sad": 0.05, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.1}},
        {"timestamp": 12, "expressions": {"neutral": 0.45, "happy": 0.2, "sad": 0.1, "angry": 0.05, "fearful": 0.1, "disgusted": 0.05, "surprised": 0.05}},
        {"timestamp": 14, "expressions": {"neutral": 0.5, "happy": 0.15, "sad": 0.1, "angry": 0.05, "fearful": 0.05, "disgusted": 0.1, "surprised": 0.05}},
        {"timestamp": 16, "expressions": {"neutral": 0.4, "happy": 0.25, "sad": 0.05, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.15}},
        {"timestamp": 18, "expressions": {"neutral": 0.35, "happy": 0.35, "sad": 0.05, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.1}},
        {"timestamp": 20, "expressions": {"neutral": 0.4, "happy": 0.2, "sad": 0.2, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.05}},
        {"timestamp": 22, "expressions": {"neutral": 0.45, "happy": 0.15, "sad": 0.15, "angry": 0.1, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.05}},
        {"timestamp": 24, "expressions": {"neutral": 0.5, "happy": 0.2, "sad": 0.1, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.05}},
        {"timestamp": 26, "expressions": {"neutral": 0.4, "happy": 0.3, "sad": 0.05, "angry": 0.05, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.1}},
        {"timestamp": 28, "expressions": {"neutral": 0.35, "happy": 0.25, "sad": 0.1, "angry": 0.1, "fearful": 0.05, "disgusted": 0.05, "surprised": 0.1}},
        {"timestamp": 30, "expressions": {"neutral": 0.45, "happy": 0.2, "sad": 0.1, "angry": 0.05, "fearful": 0.1, "disgusted": 0.05, "surprised": 0.05}}
    ]'
    
    echo "Inserting user: $user_id (Age: $age, Gender: $gender)"
    
    # Insert demographics
    curl -s -X POST "$VITE_PUBLIC_SUPABASE_URL/rest/v1/user_demographics" \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{
            \"user_id\": \"$user_id\",
            \"age\": \"$age\",
            \"gender\": \"$gender\",
            \"race\": \"white\",
            \"ethnicity\": \"non-hispanic\",
            \"nationality\": \"USA\"
        }"
    
    # Insert sentiment data
    curl -s -X POST "$VITE_PUBLIC_SUPABASE_URL/rest/v1/user_sentiment" \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{
            \"user_id\": \"$user_id\",
            \"sentiment_data\": $sentiment_data
        }"
    
    # Insert duration data
    curl -s -X POST "$VITE_PUBLIC_SUPABASE_URL/rest/v1/capture_durations" \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{
            \"capture_id\": \"$(uuidgen)\",
            \"user_id\": \"$user_id\",
            \"duration\": 30000,
            \"precise_duration\": \"30.000s\",
            \"formatted_duration\": \"0m 30s\",
            \"recorded_at\": \"$(date -Iseconds)\"
        }"
    
    echo "✅ User $user_id inserted"
    echo ""
}

# Generate multiple test users
echo "Generating test users..."
echo ""

# User 1
generate_user_data "test-user-$(uuidgen)" "18-24" "male"

# User 2
generate_user_data "test-user-$(uuidgen)" "25-34" "female"

# User 3
generate_user_data "test-user-$(uuidgen)" "35-44" "non-binary"

# User 4
generate_user_data "test-user-$(uuidgen)" "18-24" "female"

# User 5
generate_user_data "test-user-$(uuidgen)" "45-54" "male"

# User 6
generate_user_data "test-user-$(uuidgen)" "25-34" "male"

# User 7
generate_user_data "test-user-$(uuidgen)" "35-44" "female"

# User 8
generate_user_data "test-user-$(uuidgen)" "55-64" "male"

echo "✨ Test data generation complete!"
echo "You can now view this data in the admin dashboard."