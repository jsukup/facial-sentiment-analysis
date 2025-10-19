# Data Flow Fix - User Onboarding to Correct Tables

## Issue
User onboarding information was referenced as being stored in `kv_store_*` tables instead of the proper `user_*` tables defined in the database schema.

## Solution Implemented

### 1. Database Schema Alignment
The proper tables are already defined in the schema:
- `user_demographics` - Stores participant demographic information
- `user_webcapture` - Stores webcam video metadata
- `user_sentiment` - Stores facial emotion analysis data

### 2. API Endpoint Updates (`supabase/functions/server/index.ts`)

#### Demographics Endpoint
- ✅ Correctly stores data in `user_demographics` table
- ✅ Returns generated `uid` from database
- ✅ No longer references any kv_store

#### Webcam Upload Endpoint  
- ✅ Fixed column names: `user_uid` (not `uid`), `video_path` (not `video_storage_path`)
- ✅ Added `experiment_id` field for proper experiment tracking
- ✅ Returns `capture_id` for sentiment data association

#### Sentiment Endpoint
- ✅ Properly stores data with `capture_id` reference
- ✅ Handles both single data points and arrays
- ✅ Maps sentiment data to correct table structure
- ✅ Auto-finds most recent capture if ID not provided

### 3. Frontend Updates

#### App.tsx
- ✅ Receives and uses database-generated `uid` 
- ✅ Passes `captureId` through the data flow
- ✅ Properly structured API calls

#### ExperimentView.tsx
- ✅ Captures and returns `captureId` from video upload
- ✅ Passes capture ID to parent for sentiment association

### 4. Migration Script (`002_fix_data_flow.sql`)
Created comprehensive migration to:
- Ensure all columns exist with correct types
- Add missing indexes for performance
- Set up proper RLS policies for public insertion
- Verify data integrity and relationships

### 5. Test Script (`scripts/test-data-flow.js`)
Created test script to verify:
- Demographics stored in `user_demographics` ✅
- Webcapture stored in `user_webcapture` ✅  
- Sentiment stored in `user_sentiment` ✅
- Proper foreign key relationships ✅
- No kv_store usage ✅

## Data Flow

```
User Registration
    ↓
user_demographics (uid generated)
    ↓
Webcam Recording
    ↓
user_webcapture (capture_id generated, references user_uid)
    ↓
Sentiment Analysis
    ↓
user_sentiment (references capture_id)
```

## How to Test

1. Run the migration (if needed):
```bash
npx supabase db push
```

2. Run the test script:
```bash
node scripts/test-data-flow.js
```

3. Test the full user flow in the app:
   - Open the app
   - Select "Participant Mode"
   - Complete demographics form
   - Allow webcam access
   - Watch video and complete experiment
   - Check Supabase dashboard for data in correct tables

## Verification

Check that data appears in these tables (not kv_store):
- `user_demographics` - User information
- `user_webcapture` - Video metadata
- `user_sentiment` - Emotion analysis data

## API Endpoints

All endpoints properly use PostgreSQL tables:

| Endpoint | Method | Table Used |
|----------|--------|------------|
| `/demographics` | POST | user_demographics |
| `/upload-webcam` | POST | user_webcapture |
| `/sentiment` | POST | user_sentiment |
| `/all-demographics` | GET | user_demographics |
| `/all-sentiment` | GET | user_sentiment |
| `/webcam-video/:userId` | GET | user_webcapture |

## Next Steps

1. Deploy the updated edge function to Supabase
2. Run the migration on production database
3. Test the complete user flow
4. Monitor for any issues
5. Remove any legacy kv_store references if they exist

## Notes

- The system now properly uses relational database design
- Foreign key constraints ensure data integrity
- RLS policies allow public insertion while restricting reads to admins
- 90-day retention is handled at the database level
- All data relationships are properly maintained