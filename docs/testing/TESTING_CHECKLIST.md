# 🧪 Comprehensive UI/UX Testing Checklist

**Environment**: Fresh Development Setup  
**Frontend**: http://localhost:3000  
**Backend**: https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/server/  
**Test Date**: October 21, 2025  

## ✅ Prerequisites Completed

- [x] All security vulnerabilities resolved (0 vulnerabilities found)
- [x] Vitest configuration fixed with happy-dom environment  
- [x] Face-api.js properly mocked in test environment
- [x] All localhost processes killed and restarted fresh
- [x] Development server running on http://localhost:3000
- [x] Backend deployed and responding (authentication required as expected)

## 📋 **Phase 1: Participant Journey Testing**

### Test 1: Privacy and Registration Flow
**Objective**: Complete participant registration with demographic data

**Steps**:
1. Navigate to http://localhost:3000
2. Click "Start as Participant" 
3. Review and accept privacy policy modal
4. Fill demographic form:
   - Age: "25-34"
   - Gender: "Male" 
   - Race: "Asian"
   - Ethnicity: "Not Hispanic or Latino"
   - Nationality: "United States"
5. Submit form

**Expected Results**:
- [ ] Privacy modal displays properly with scroll and accept functionality
- [ ] Demographic form validates all required fields
- [ ] Form submission succeeds with API call to `/server/demographics`
- [ ] User receives a UUID userId 
- [ ] Navigation proceeds to webcam setup
- [ ] No console errors during flow

**Database Validation**:
```sql
SELECT * FROM user_demographics ORDER BY created_at DESC LIMIT 1;
```

---

### Test 2: Webcam Setup and Permissions
**Objective**: Verify camera access and video stream initialization

**Steps**:
1. Continue from Test 1
2. Allow camera permissions when prompted
3. Verify webcam preview displays
4. Test camera controls (if available)
5. Continue to experiment

**Expected Results**:
- [ ] Browser requests camera permission appropriately
- [ ] Live webcam feed displays in preview window
- [ ] Video stream is clear and responsive
- [ ] MediaStream objects are properly initialized
- [ ] Continue button becomes enabled
- [ ] No memory leaks or performance degradation

**Browser Console Should Show**:
- No camera-related errors
- MediaStream successfully acquired
- Video dimensions properly detected

---

### Test 3: Video Experiment and Facial Detection
**Objective**: Test core facial sentiment analysis functionality

**Steps**:
1. Continue from Test 2
2. Read experiment instructions modal
3. Click "Start Experiment" 
4. Watch Big Buck Bunny video while face detection runs
5. Monitor sentiment data capture in real-time
6. Complete full video duration

**Expected Results**:
- [ ] Experiment video (Big Buck Bunny) loads and plays smoothly
- [ ] Face-api.js models load without errors (640KB bundle)
- [ ] Real-time facial detection activates (every 500ms)
- [ ] Sentiment data displays: neutral, happy, sad, angry, fearful, disgusted, surprised
- [ ] Webcam recording runs parallel to experiment video
- [ ] Memory usage remains stable during ~10 minute video
- [ ] Video synchronization between experiment and webcam

**Performance Monitoring**:
- CPU usage should remain manageable
- Memory should not continuously increase
- Face detection processing < 500ms per cycle
- No frame drops or video stuttering

---

### Test 4: Data Submission and Storage
**Objective**: Verify all captured data persists correctly

**Steps**:
1. Complete video experiment from Test 3
2. Wait for automatic data submission
3. Review thank you modal
4. Verify data persistence

**Expected Results**:
- [ ] Webcam video upload succeeds to Supabase storage
- [ ] Sentiment data submission completes successfully
- [ ] Thank you modal displays completion message
- [ ] All data persisted in appropriate database tables
- [ ] Video file accessible in Supabase storage bucket

**Database Validation**:
```sql
-- Check sentiment data
SELECT uid, created_at, 
       jsonb_array_length(sentiment_data) as datapoint_count,
       sentiment_data->0 as first_datapoint
FROM user_sentiment 
ORDER BY created_at DESC LIMIT 1;

-- Check video upload
SELECT * FROM user_webcapture ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 **Phase 2: Admin Dashboard Testing**

### Test 5: Admin Authentication
**Objective**: Verify admin login security and functionality

**Steps**:
1. Open new browser tab to http://localhost:3000
2. Click "Admin Dashboard"
3. Enter admin credentials:
   - Email: john@expectedx.com
   - Password: [from environment or documentation]
4. Test incorrect credentials (security validation)

**Expected Results**:
- [ ] AdminLogin component renders properly
- [ ] Form validation works for email format
- [ ] Correct credentials allow access to dashboard
- [ ] Incorrect credentials show appropriate error message
- [ ] Non-admin users are denied access
- [ ] Session management works correctly

**Security Testing**:
- [ ] Password field masked appropriately
- [ ] No credentials visible in browser dev tools
- [ ] Failed login attempts handled gracefully

---

### Test 6: Dashboard Data Visualization
**Objective**: Test admin analytics and data display

**Steps**:
1. Continue from successful admin login (Test 5)
2. Wait for dashboard data to load
3. Review participant count and statistics
4. Test demographic filtering options
5. Verify video playback functionality
6. Review sentiment charts (if ≥5 participants)

**Expected Results**:
- [ ] Dashboard loads participant count correctly
- [ ] Demographic filters populate with actual data
- [ ] Video player displays Big Buck Bunny for reference
- [ ] Sentiment charts render using Recharts components
- [ ] Data updates reflect applied filters
- [ ] Performance remains smooth with multiple participants

**UI Components Validation**:
- [ ] Cards display data appropriately
- [ ] Select dropdowns work for filtering
- [ ] Charts are responsive and interactive
- [ ] Video controls function properly

---

### Test 7: Privacy Protection Features
**Objective**: Validate privacy threshold enforcement

**Steps**:
1. Continue from dashboard (Test 6)
2. Check current participant count
3. Apply filters to reduce visible participants to <5
4. Verify privacy warning displays
5. Confirm charts are hidden when below threshold
6. Remove filters to show ≥5 participants
7. Verify charts become visible again

**Expected Results**:
- [ ] Privacy warning appears when filtered count <5 participants
- [ ] Warning message clearly explains 5-participant minimum
- [ ] Sentiment charts hidden when below threshold
- [ ] Video player remains visible regardless of threshold
- [ ] Dynamic filtering updates warning in real-time
- [ ] Charts reappear when threshold is met

**Privacy Compliance**:
- [ ] No individual data identifiable when aggregated
- [ ] User privacy is maintained throughout dashboard
- [ ] Appropriate data anonymization applied

---

## ⚡ **Phase 3: Technical Performance Testing**

### Test 8: Memory and Performance Monitoring
**Objective**: Ensure application performs well under load

**Steps**:
1. Open browser dev tools (Performance tab)
2. Complete full participant journey
3. Monitor memory usage during video experiment
4. Test with multiple browser tabs
5. Measure page load times and bundle sizes

**Expected Results**:
- [ ] Initial page load <3 seconds (LCP target: 2.9s)
- [ ] Face-api.js bundle (640KB) loads efficiently
- [ ] Memory usage stable during extended video session
- [ ] No memory leaks after completing experiment
- [ ] CPU usage acceptable during facial detection
- [ ] Bundle size within 1.53MB total target

**Performance Metrics**:
- Core Web Vitals (LCP, CLS, FID) within targets
- Face detection processing maintains 500ms interval
- Video upload completes without timeouts

---

### Test 9: Error Handling and Edge Cases
**Objective**: Test application resilience and error recovery

**Steps**:
1. Test with camera permission denied
2. Test with network interruption during video upload
3. Test with invalid demographic data submission
4. Test admin login with network failures
5. Test face detection with poor lighting or no face visible

**Expected Results**:
- [ ] Camera permission denial handled gracefully
- [ ] Network failures show appropriate error messages
- [ ] Form validation prevents invalid submissions
- [ ] API timeouts handled with retry mechanisms
- [ ] Face detection handles edge cases (no face, multiple faces)
- [ ] Error recovery allows user to continue

**Error Messages**:
- [ ] User-friendly error messages displayed
- [ ] Technical errors logged appropriately (Sentry integration)
- [ ] No application crashes or unhandled exceptions

---

### Test 10: End-to-End Integration
**Objective**: Validate complete system integration

**Steps**:
1. Complete full participant journey from registration to completion
2. Immediately check admin dashboard for new data
3. Verify data integrity across all components
4. Test real-time updates and synchronization

**Expected Results**:
- [ ] New participant data appears in admin dashboard immediately
- [ ] All data relationships maintained across tables
- [ ] Video files properly linked to sentiment data
- [ ] Demographic filtering includes new participant
- [ ] Charts update with new data points
- [ ] No data corruption or inconsistencies

---

## 🎯 **Success Criteria Summary**

### Critical Path Requirements
- [x] Development environment clean restart successful
- [ ] Complete participant registration and data submission
- [ ] Facial sentiment analysis captures accurate emotion data
- [ ] Admin dashboard displays real participant data
- [ ] Privacy protection enforces 5-participant minimum
- [ ] No console errors or application crashes
- [ ] All API endpoints respond correctly

### Performance Targets
- [ ] Page load time <3 seconds
- [ ] Face detection processing <500ms intervals
- [ ] Memory usage stable throughout session
- [ ] Video upload completion without failures
- [ ] Bundle size ≤1.6MB (current: 1.53MB)

### Quality Assurance
- [ ] Security vulnerabilities resolved (✅ 0 found)
- [ ] Test environment properly configured (✅ happy-dom)
- [ ] All database operations successful
- [ ] Error handling comprehensive and user-friendly
- [ ] Privacy compliance maintained

---

## 📝 **Testing Results Documentation**

### Issues Found
1. 
2. 
3. 

### Performance Observations
- Initial load time: _____ seconds
- Face detection average processing: _____ ms
- Memory usage during video: _____ MB
- Video upload duration: _____ seconds

### Recommendations
1. 
2. 
3. 

### Next Steps
- [ ] Address any critical issues found
- [ ] Optimize performance bottlenecks
- [ ] Commit and push CI/CD fixes
- [ ] Verify GitHub Actions pipeline passes
- [ ] Proceed with production deployment validation

---

**Testing Status**: Ready to begin comprehensive testing
**Environment Validated**: ✅ Fresh development setup complete  
**Frontend Ready**: ✅ http://localhost:3000  
**Backend Ready**: ✅ Supabase functions deployed  
**Test Framework**: ✅ Fixed and validated