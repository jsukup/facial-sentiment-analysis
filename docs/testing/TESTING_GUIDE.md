# Testing Guide - Week 1, Day 3

**Date**: October 15, 2025
**Status**: Ready for Manual Testing
**Checklist Reference**: [docs/planning/IMPLEMENTATION_CHECKLIST.md](docs/planning/IMPLEMENTATION_CHECKLIST.md) - Tasks 3.1-3.8

---

## Prerequisites

### 1. Install Dependencies

```bash
cd /home/john/facial_sentiment
npm install
```

**Expected Result**: All dependencies installed without errors

---

### 2. Create Environment File

The project uses [src/utils/supabase/info.tsx](src/utils/supabase/info.tsx) which already contains:
- `projectId`: spylqvzwvcjuaqgthxhw
- `publicAnonKey`: (configured)

**Action**: Create `.env.local` for additional configuration if needed:

```bash
# .env.local (optional - info.tsx already has keys)
VITE_SUPABASE_PROJECT_ID=spylqvzwvcjuaqgthxhw
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweWxxdnp3dmNqdWFxZ3RoeGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ3MzgsImV4cCI6MjA3NjA2MDczOH0.2ntz0T5p31sswDYp6RmSK23PnVStC_UC373mbPx3aYk
```

---

### 3. Verify Backend is Accessible

**Important**: The backend needs to be running for testing. There are two options:

#### Option A: Test with Supabase Edge Functions (Recommended)

The backend at [supabase/functions/server/index.tsx](supabase/functions/server/index.tsx) needs to be deployed:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref spylqvzwvcjuaqgthxhw

# Deploy the function
supabase functions deploy server
```

**Backend URL**: `https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/make-server-8f45bf92`

#### Option B: Run Backend Locally (Alternative)

```bash
# Serve functions locally
supabase functions serve server
```

**Local URL**: `http://localhost:54321/functions/v1/make-server-8f45bf92`

---

### 4. Start Frontend Development Server

```bash
npm run dev
```

**Expected Output**:
```
  VITE v6.3.5  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

## Test Scenarios

### **Test 1: User Registration Flow** ✓

**Objective**: Verify participant can complete demographic registration

**Steps**:
1. Open http://localhost:3000/
2. Select "Start as Participant"
3. Read and accept privacy policy
4. Fill out demographic form:
   - Age: "25-34"
   - Gender: "Male"
   - Race: "Asian"
   - Ethnicity: "Not Hispanic or Latino"
   - Nationality: "United States"
5. Click "Continue"

**Expected Results**:
- ✅ Privacy modal displays correctly
- ✅ Demographic form validates required fields
- ✅ API call to `POST /demographics` succeeds
- ✅ User receives a `userId` (UUID format)
- ✅ Proceeds to webcam setup screen

**Validation**:
```bash
# Check database
psql -h db.spylqvzwvcjuaqgthxhw.supabase.co -U postgres -d postgres
SELECT * FROM user_demographics ORDER BY created_at DESC LIMIT 1;
```

**Pass Criteria**: New row in `user_demographics` table with correct data

---

### **Test 2: Webcam Setup** ✓

**Objective**: Verify webcam permissions and video capture setup

**Steps**:
1. Continue from Test 1
2. Browser prompts for camera permission
3. Grant camera access
4. Verify webcam preview displays
5. Click "Continue"

**Expected Results**:
- ✅ Browser requests camera permission
- ✅ Webcam stream displays in preview
- ✅ MediaStream captured successfully
- ✅ Proceeds to experiment details screen

**Chrome-Specific**:
- Must test in Chrome (MVP requirement)
- Camera icon should show in address bar
- Can revoke/grant permissions in chrome://settings/content/camera

**Pass Criteria**: Live webcam feed visible, no console errors

---

### **Test 3: Experiment Video Playback** ✓

**Objective**: Verify experiment video loads and facial analysis works

**Steps**:
1. Continue from Test 2
2. Read experiment instructions
3. Click "Start Experiment"
4. Experiment video plays (Big Buck Bunny)
5. Watch for sentiment detection

**Expected Results**:
- ✅ Experiment instructions modal displays
- ✅ Video loads from: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`
- ✅ face-api.js models load successfully
- ✅ Facial detection runs every 500ms
- ✅ Sentiment data captured and displayed
- ✅ Webcam recording synchronized with experiment video

**Browser Console Should Show**:
```
✓ Face-api.js models loaded
✓ Detecting sentiment... (repeatedly)
✓ Sentiment data: {neutral: 0.8, happy: 0.1, ...}
```

**Pass Criteria**: Video plays, face detected, sentiment captured without errors

---

### **Test 4: Webcam Upload** ✓

**Objective**: Verify webcam recording uploads to Supabase Storage

**Steps**:
1. Continue through experiment
2. Let video complete
3. Webcam recording should auto-stop
4. Upload process begins

**Expected Results**:
- ✅ Webcam recording stops when video ends
- ✅ API call to `POST /upload-webcam` succeeds
- ✅ Video file uploaded to Supabase Storage bucket
- ✅ Metadata stored in `user_webcapture` table

**Validation**:
```bash
# Check Supabase Storage
# Go to: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/storage/buckets
# Bucket: make-8f45bf92-user-webcapture
# Should see file: {userId}_{timestamp}.webm
```

**Database Check**:
```sql
SELECT * FROM user_webcapture ORDER BY created_at DESC LIMIT 1;
```

**Pass Criteria**: Video file in storage, metadata in database

---

### **Test 5: Sentiment Data Submission** ✓

**Objective**: Verify sentiment data saves to database

**Steps**:
1. After experiment completes
2. Sentiment data automatically submitted
3. Thank you screen displays

**Expected Results**:
- ✅ API call to `POST /sentiment` succeeds
- ✅ Sentiment data stored as JSONB in database
- ✅ Array of sentiment datapoints with timestamps
- ✅ Thank you modal displays

**Validation**:
```sql
SELECT uid, created_at,
       jsonb_array_length(sentiment_data) as datapoint_count
FROM user_sentiment
ORDER BY created_at DESC LIMIT 1;
```

**Expected Data Structure**:
```json
[
  {
    "timestamp": 0.5,
    "emotions": {
      "neutral": 0.85,
      "happy": 0.10,
      "sad": 0.02,
      "angry": 0.01,
      "fearful": 0.01,
      "disgusted": 0.01,
      "surprised": 0.00
    }
  },
  // ... more datapoints every 500ms
]
```

**Pass Criteria**: Sentiment data in database, multiple datapoints captured

---

### **Test 6: Admin Login Flow** ✓

**Objective**: Verify admin can authenticate successfully

**Steps**:
1. Refresh http://localhost:3000/
2. Select "Admin Dashboard"
3. Redirected to login screen
4. Enter credentials:
   - Email: `john@expectedx.com`
   - Password: (password set during database setup)
5. Click "Sign In"

**Expected Results**:
- ✅ AdminLogin component displays
- ✅ Form validates email format
- ✅ Supabase Auth authentication succeeds
- ✅ Verifies user exists in `admin_users` table
- ✅ Redirects to AdminDashboard
- ✅ No access with incorrect credentials

**Test Negative Case**:
- Try logging in with non-admin email → Should show "Access denied"
- Try wrong password → Should show authentication error

**Pass Criteria**: Successful login with admin credentials, denied for non-admin

---

### **Test 7: Admin Dashboard Data Display** ✓

**Objective**: Verify dashboard loads and displays participant data

**Steps**:
1. Continue from Test 6 (logged in as admin)
2. Dashboard should load
3. Verify data displays:
   - Participant count
   - Demographic filters
   - Video player
   - Sentiment charts (if ≥5 participants)

**Expected Results**:
- ✅ API calls to `GET /all-demographics` succeed
- ✅ API calls to `GET /all-sentiment` succeed
- ✅ Participant count displays correctly
- ✅ Demographic filters populate with data
- ✅ Video player loads Big Buck Bunny
- ✅ Charts display if enough participants

**Browser Console Should Show**:
```
✓ Fetched X demographics records
✓ Fetched Y sentiment records
✓ Combined user data: X participants
```

**Pass Criteria**: Dashboard loads, data fetched, UI renders correctly

---

### **Test 8: Privacy Threshold Enforcement** ✓

**Objective**: Verify privacy protection with <5 participants

**Steps**:
1. On Admin Dashboard
2. Check current participant count
3. If < 5 participants:
   - Warning banner should display
   - Charts should be hidden
4. If ≥ 5 participants:
   - No warning
   - Charts visible

**Expected Results**:
- ✅ Participant count displayed accurately
- ✅ Warning displays when filtered count < 5
- ✅ Warning message explains threshold
- ✅ Charts hidden when below threshold
- ✅ Video player remains visible
- ✅ Filters work and update warning dynamically

**Test Scenario A: Below Threshold (< 5 users)**
```
Filtered dataset: 3 participants
Expected:
- ⚠️ Warning banner visible
- 📊 Charts hidden
- 🎬 Video player visible
```

**Test Scenario B: Above Threshold (≥ 5 users)**
```
Filtered dataset: 5+ participants
Expected:
- ✅ No warning banner
- 📊 Charts visible
- 🎬 Video player visible
```

**Test Dynamic Filtering**:
1. Start with all participants (no filters)
2. Apply age filter → reduce to < 5 participants
3. Warning should appear, charts should hide
4. Remove filter → warning disappears, charts show

**Pass Criteria**: Privacy protection works, dynamic filtering updates correctly

---

## Known Issues & Workarounds

### Issue: Backend Not Deployed
**Symptom**: API calls fail with network errors
**Solution**: Deploy backend first (see Prerequisites section)

### Issue: Camera Permission Denied
**Symptom**: Webcam setup fails
**Solution**:
- Chrome: Go to chrome://settings/content/camera
- Allow camera for localhost
- Refresh page

### Issue: face-api.js Models Not Loading
**Symptom**: Sentiment detection fails
**Solution**:
- Check network tab for 404s on model files
- Verify models are in `/public/models/` directory
- Models should load from CDN or local

### Issue: CORS Errors
**Symptom**: Backend API calls blocked
**Solution**:
- Backend has CORS enabled for `origin: "*"`
- Check browser console for specific CORS errors
- Verify backend URL is correct

---

## Test Results Template

Copy this template to document your test results:

```markdown
## Test Execution Results - [Date]

**Tester**: [Your Name]
**Environment**:
- Frontend: http://localhost:3000/
- Backend: [URL]
- Browser: Chrome [version]

### Test 1: User Registration ⬜
- [ ] Privacy modal displayed
- [ ] Form validation works
- [ ] API call succeeded
- [ ] Database entry created
**Status**: ⬜ Pass / ⬜ Fail
**Notes**:

### Test 2: Webcam Setup ⬜
- [ ] Camera permission requested
- [ ] Webcam preview displayed
- [ ] MediaStream captured
**Status**: ⬜ Pass / ⬜ Fail
**Notes**:

### Test 3: Experiment Video ⬜
- [ ] Video loaded and played
- [ ] Face detection working
- [ ] Sentiment captured
**Status**: ⬜ Pass / ⬜ Fail
**Notes**:

### Test 4: Webcam Upload ⬜
- [ ] Recording stopped
- [ ] Upload succeeded
- [ ] File in storage
- [ ] Database entry created
**Status**: ⬜ Pass / ⬜ Fail
**Notes**:

### Test 5: Sentiment Submission ⬜
- [ ] API call succeeded
- [ ] Data in database
- [ ] Thank you modal displayed
**Status**: ⬜ Pass / ⬜ Fail
**Notes**:

### Test 6: Admin Login ⬜
- [ ] Login form displayed
- [ ] Authentication succeeded
- [ ] Admin verification worked
- [ ] Negative test passed
**Status**: ⬜ Pass / ⬜ Fail
**Notes**:

### Test 7: Admin Dashboard ⬜
- [ ] Data fetched successfully
- [ ] Participant count correct
- [ ] Filters working
- [ ] Charts displaying
**Status**: ⬜ Pass / ⬜ Fail
**Notes**:

### Test 8: Privacy Threshold ⬜
- [ ] Warning displays < 5 users
- [ ] Charts hidden < 5 users
- [ ] Dynamic filtering works
**Status**: ⬜ Pass / ⬜ Fail
**Notes**:

### Critical Issues Found:
1.
2.
3.

### Recommendations:
1.
2.
3.
```

---

## Next Steps After Testing

### If All Tests Pass ✅
Proceed to Week 1, Day 4: Backend Deployment
- Deploy backend to Supabase Edge Functions
- Update frontend to use production backend URL
- Re-test with production backend

### If Tests Fail ❌
1. Document all failures in test results template
2. Prioritize critical path issues:
   - User cannot complete registration
   - Admin cannot login
   - Data not persisting
3. Use `/sc:troubleshoot` for each issue
4. Fix issues and re-test

### Test Coverage Analysis
After manual testing, assess:
- Which flows are working end-to-end?
- Which components need debugging?
- What edge cases were discovered?
- Are we ready for automated testing (Week 2)?

---

## Quick Reference

**Frontend URL**: http://localhost:3000/
**Backend URL**: https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/make-server-8f45bf92
**Supabase Dashboard**: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw
**Admin Credentials**: john@expectedx.com / [password]

**API Endpoints**:
- POST `/demographics` - Register participant
- POST `/upload-webcam` - Upload video file
- POST `/sentiment` - Save sentiment data
- GET `/all-demographics` - Fetch all participants (admin)
- GET `/all-sentiment` - Fetch all sentiment data (admin)
- GET `/webcam-video/:userId` - Get signed video URL (admin)

**Database Tables**:
- `user_demographics` - Participant info
- `user_webcapture` - Video metadata
- `user_sentiment` - Sentiment analysis data
- `experiment_videos` - Experiment video config
- `admin_users` - Admin authorization

---

**Status**: Ready for testing after `npm install` and backend deployment
