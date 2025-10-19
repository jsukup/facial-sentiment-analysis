# Implementation Checklist - Analysis-Enhanced MVP
## Facial Sentiment Analysis Webapp

**Configuration**: Security-first, performance-optimized for john@expectedx.com
**Timeline**: 3-4 weeks to production
**Target**: MVP Demo with 80% test coverage + Technical Debt Resolution
**Analysis Integration**: Addresses B+ (82/100) → A- (90/100) improvement plan

---

## 🚀 WEEK 1: Security-First Critical Fixes & Database Migration

### Day 1: SECURITY HARDENING (Monday) - NEW PRIORITY

#### Morning: API Security (CRITICAL - Analysis Finding)
**🔴 ADDRESSES: Exposed API Keys + CORS Security**

- [ ] **1.0a** Create `.env.local` file with Supabase credentials:
  ```env
  VITE_SUPABASE_PROJECT_ID=spylqvzwvcjuaqgthxhw
  VITE_SUPABASE_ANON_KEY=[Move from src/utils/supabase/info.tsx]
  ```

- [ ] **1.0b** Update `src/utils/supabase/info.tsx`:
  ```typescript
  export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID
  export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!projectId || !publicAnonKey) {
    throw new Error('Missing Supabase configuration')
  }
  ```

- [ ] **1.0c** Add `.env.local` to `.gitignore`
- [ ] **1.0d** Create `.env.example` template
- [ ] **1.0e** **SECURITY VALIDATION**: Run `npm run build && grep -r "eyJh" dist/` (should return no results)

#### Afternoon: Database Setup (Enhanced)

### Day 1: Database Setup (Monday)

#### Morning: Supabase Database Migration
- [ ] **1.1** Open Supabase Dashboard: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw
- [ ] **1.2** Go to SQL Editor
- [ ] **1.3** Copy content from [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
- [ ] **1.4** Run the SQL migration
- [ ] **1.5** Verify tables created (should see 5 new tables)
- [ ] **1.6** Run [scripts/verify-setup.sql](scripts/verify-setup.sql) to confirm setup
- [ ] **1.7** Check that Big Buck Bunny video exists in `experiment_videos` table

**Expected Output**:
```
✅ 5 tables created: user_demographics, user_webcapture, user_sentiment, experiment_videos, admin_users
✅ RLS enabled on all tables
✅ 4 admin policies created
✅ 5 indexes created
✅ 1 experiment video inserted
```

#### Afternoon: Admin User Setup
- [ ] **1.8** Go to Supabase Dashboard > Authentication > Users
- [ ] **1.9** Click "Add User"
- [ ] **1.10** Enter:
  - Email: `john@expectedx.com`
  - Password: [Choose strong password - save it!]
  - Auto Confirm: ✅ Yes
- [ ] **1.11** Click "Create User"
- [ ] **1.12** Go back to SQL Editor
- [ ] **1.13** Run [scripts/setup-admin.sql](scripts/setup-admin.sql)
- [ ] **1.14** Verify admin user linked (should return 1 row with your email)

**Test**:
```sql
SELECT * FROM admin_users WHERE email = 'john@expectedx.com';
-- Should return: admin_id, john@expectedx.com, auth_user_id, created_at
```

---

### Day 2: Backend API Migration (Tuesday)

#### Morning: Update Backend Code
- [ ] **2.1** Open [src/supabase/functions/server/index.tsx](src/supabase/functions/server/index.tsx)
- [ ] **2.2** **BACKUP CURRENT FILE** (copy to `index.tsx.backup`)
- [ ] **2.3** Replace entire file with updated code from [RAPID_MVP_WORKFLOW.md](RAPID_MVP_WORKFLOW.md) (lines 207-508)
- [ ] **2.4** Delete `src/supabase/functions/server/kv_store.tsx` (no longer needed)
- [ ] **2.5** Update bucket name in code:
  ```typescript
  const BUCKET_NAME = 'user-webcapture'; // Change from 'make-8f45bf92-user-webcapture'
  ```

#### Afternoon: Test Backend APIs
- [ ] **2.6** Start local development server: `npm run dev`
- [ ] **2.7** Test health endpoint:
  ```bash
  curl https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/server/health
  # Expected: {"status":"ok"}
  ```

- [ ] **2.8** Test demographics API:
  ```bash
  curl -X POST https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/server/demographics \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer [YOUR_SUPABASE_ANON_KEY]" \
    -d '{"age":"25-34","gender":"female","race":"asian","nationality":"US"}'
  ```
  - Expected: `{"success":true,"userId":"[UUID]"}`
  - [ ] **2.9** Verify in Supabase Dashboard > Table Editor > user_demographics (should see 1 row)

- [ ] **2.10** Test all-demographics API:
  ```bash
  curl https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/server/all-demographics \
    -H "Authorization: Bearer [YOUR_SUPABASE_ANON_KEY]"
  ```
  - Expected: `{"demographics":[...]}`

---

### Day 3: Frontend Integration (Wednesday)

#### Morning: Update Frontend API Calls
- [ ] **3.1** Open [src/App.tsx](src/App.tsx)
- [ ] **3.2** Update API endpoint URLs:
  ```typescript
  // Change from:
  `https://${projectId}.supabase.co/functions/v1/make-server-8f45bf92/demographics`
  // To:
  `https://${projectId}.supabase.co/functions/v1/server/demographics`
  ```
- [ ] **3.3** Update `handleDemographicComplete` function (see [RAPID_MVP_WORKFLOW.md](RAPID_MVP_WORKFLOW.md) lines 713-743)
- [ ] **3.4** Remove client-side userId generation (server now generates it)

#### Afternoon: Create Admin Login Component
- [ ] **3.5** Create new file: `src/components/AdminLogin.tsx`
- [ ] **3.6** Copy code from [RAPID_MVP_WORKFLOW.md](RAPID_MVP_WORKFLOW.md) (lines 520-631)
- [ ] **3.7** Fix password field bug (line 610): `value={password}` not `value={email}`
- [ ] **3.8** Update [src/App.tsx](src/App.tsx):
  ```typescript
  import { AdminLogin } from "./components/AdminLogin";

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  case "admin":
    return isAdminAuthenticated ? (
      <AdminDashboard />
    ) : (
      <AdminLogin onLoginSuccess={() => setIsAdminAuthenticated(true)} />
    );
  ```

---

### Day 4: Privacy Threshold & Admin Dashboard Updates (Thursday)

#### Morning: Privacy Threshold Implementation
- [ ] **4.1** Open [src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx)
- [ ] **4.2** Add near top of component:
  ```typescript
  import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
  import { AlertCircle } from "lucide-react";

  const MINIMUM_PARTICIPANT_THRESHOLD = 5;
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  ```

- [ ] **4.3** Update filtered user data effect:
  ```typescript
  useEffect(() => {
    const filtered = allUserData.filter(/* existing logic */);
    setFilteredUserData(filtered);
    setShowPrivacyWarning(filtered.length < MINIMUM_PARTICIPANT_THRESHOLD);
  }, [filters, allUserData]);
  ```

- [ ] **4.4** Add warning banner before charts:
  ```typescript
  {showPrivacyWarning && (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Insufficient Participants</AlertTitle>
      <AlertDescription>
        At least {MINIMUM_PARTICIPANT_THRESHOLD} participants are required to view aggregated data.
        Current count: {filteredUserData.length}
      </AlertDescription>
    </Alert>
  )}

  {!showPrivacyWarning && (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Existing charts */}
    </div>
  )}
  ```

#### Afternoon: Update Admin Data Fetching
- [ ] **4.5** Update `fetchData` function in AdminDashboard (see [RAPID_MVP_WORKFLOW.md](RAPID_MVP_WORKFLOW.md) lines 751-804)
- [ ] **4.6** Change API endpoints from `/make-server-8f45bf92/` to `/server/`
- [ ] **4.7** Update data mapping to use `demo.uid` instead of manual userId

---

### Day 5: Enhanced Testing & Performance Validation (Friday)

#### Performance Optimization (NEW - Analysis Finding)
**🟡 ADDRESSES: Large Bundle Size (1.47MB) + Memory Leaks**

- [ ] **5.0a** Install bundle analyzer: `npm install --save-dev webpack-bundle-analyzer`
- [ ] **5.0b** Analyze bundle: `npm run build && npx webpack-bundle-analyzer dist/assets/*.js`
- [ ] **5.0c** Document bundle size (current: 1.47MB, target: <1MB)
- [ ] **5.0d** Fix MediaRecorder memory leaks in `ExperimentView.tsx`
- [ ] **5.0e** Fix webcam stream cleanup in `WebcamSetup.tsx`
- [ ] **5.0f** Test memory usage during 5-minute session

#### End-to-End Manual Testing

**Participant Flow** (30 minutes):
- [ ] **5.1** Open http://localhost:5173
- [ ] **5.2** Click "Participant Mode"
- [ ] **5.3** Accept privacy policy
- [ ] **5.4** Fill demographics form and submit
- [ ] **5.5** Allow webcam permissions
- [ ] **5.6** Position in webcam frame, click Ready
- [ ] **5.7** Read experiment instructions, click Ready
- [ ] **5.8** Wait for face-api models to load (~5 seconds)
- [ ] **5.9** Click Play on video
- [ ] **5.10** Let video run for 30 seconds (check console for facial analysis logs)
- [ ] **5.11** Stop video or let it complete
- [ ] **5.12** Verify thank you modal appears

**Verify in Database**:
- [ ] **5.13** Check Supabase > Table Editor > user_demographics (should have 1+ rows)
- [ ] **5.14** Check user_webcapture (should have video_path)
- [ ] **5.15** Check user_sentiment (should have emotion data with timestamps)
- [ ] **5.16** Check Supabase > Storage > user-webcapture bucket (should have .webm file)

**Admin Flow** (20 minutes):
- [ ] **5.17** Go to http://localhost:5173 and click "Admin Dashboard"
- [ ] **5.18** Should see Admin Login page
- [ ] **5.19** Login with john@expectedx.com and your password
- [ ] **5.20** Should see dashboard with participant count
- [ ] **5.21** If < 5 participants, should see privacy warning (expected for now)
- [ ] **5.22** Try demographic filters (even if data hidden)

**Bug Fixes**:
- [ ] **5.23** Document any issues found in `BUGS.md`
- [ ] **5.24** Fix critical bugs immediately
- [ ] **5.25** Mark medium/low bugs for Week 2

---

## 🧪 WEEK 2: Testing Infrastructure (80% Coverage)

### Day 1-2: Unit Testing Setup (Monday-Tuesday)

#### Monday Morning: Install Testing Dependencies
- [ ] **6.1** Install test dependencies:
  ```bash
  npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
  ```

- [ ] **6.2** Create `vitest.config.ts` (copy from [RAPID_MVP_WORKFLOW.md](RAPID_MVP_WORKFLOW.md) lines 895-930)
- [ ] **6.3** Create `src/test/setup.ts` (copy from lines 935-944)
- [ ] **6.4** Update `package.json` scripts:
  ```json
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
  ```

#### Monday Afternoon: Write Component Tests
- [ ] **6.5** Create `src/components/__tests__/PrivacyModal.test.tsx`
- [ ] **6.6** Copy test code from [RAPID_MVP_WORKFLOW.md](RAPID_MVP_WORKFLOW.md) (lines 951-987)
- [ ] **6.7** Run test: `npm test` - should pass

#### Tuesday: More Component Tests
- [ ] **6.8** Create `src/components/__tests__/DemographicForm.test.tsx`
- [ ] **6.9** Create `src/components/__tests__/AdminLogin.test.tsx`
- [ ] **6.10** Create `src/components/__tests__/ExperimentView.test.tsx`
- [ ] **6.11** Run all tests: `npm test`
- [ ] **6.12** Check coverage: `npm run test:coverage`
- [ ] **6.13** Target: > 60% coverage by end of day

---

### Day 3-4: E2E Testing (Wednesday-Thursday)

#### Wednesday: Playwright Setup
- [ ] **6.14** Install Playwright:
  ```bash
  npm install --save-dev @playwright/test
  npx playwright install chromium
  ```

- [ ] **6.15** Create `playwright.config.ts` (copy from [RAPID_MVP_WORKFLOW.md](RAPID_MVP_WORKFLOW.md) lines 1083-1108)
- [ ] **6.16** Create `e2e` directory
- [ ] **6.17** Create `e2e/participant-flow.spec.ts` (lines 1115-1156)
- [ ] **6.18** Create `e2e/admin-flow.spec.ts` (lines 1161-1202)

#### Thursday: Run E2E Tests
- [ ] **6.19** Start dev server: `npm run dev`
- [ ] **6.20** In new terminal: `npx playwright test --headed`
- [ ] **6.21** Watch tests run in browser
- [ ] **6.22** Fix any failing tests
- [ ] **6.23** Generate test report: `npx playwright show-report`

---

### Day 5: Coverage & Bug Fixes (Friday)

- [ ] **6.24** Run coverage report: `npm run test:coverage`
- [ ] **6.25** Identify untested components
- [ ] **6.26** Write tests for critical paths to reach 80% coverage
- [ ] **6.27** Fix bugs discovered during testing
- [ ] **6.28** Re-run all tests after fixes
- [ ] **6.29** Verify 80% coverage target met
- [ ] **6.30** Document any remaining known issues

---

## 🚀 WEEK 3: Deployment & CI/CD

### Day 1: CI/CD Pipeline (Monday)

- [ ] **7.1** Create `.github/workflows/ci.yml`
- [ ] **7.2** Copy workflow from [RAPID_MVP_WORKFLOW.md](RAPID_MVP_WORKFLOW.md) (lines 1242-1316)
- [ ] **7.3** Update workflow to only test Chrome (remove Firefox from browsers matrix)
- [ ] **7.4** Remove automated E2E from CI (manual only per your config)
- [ ] **7.5** Push to GitHub:
  ```bash
  git add .
  git commit -m "Add CI/CD pipeline"
  git push origin develop
  ```

- [ ] **7.6** Go to GitHub Actions tab
- [ ] **7.7** Verify workflow runs successfully

---

### Day 2: Vercel Setup (Tuesday)

#### Morning: Create Vercel Project
- [ ] **7.8** Go to https://vercel.com and sign up/login
- [ ] **7.9** Click "Add New Project"
- [ ] **7.10** Import your GitHub repository
- [ ] **7.11** Configure build settings:
  - Framework Preset: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`

#### Afternoon: Environment Variables
- [ ] **7.12** In Vercel project settings > Environment Variables, add:
  ```
  VITE_SUPABASE_PROJECT_ID = spylqvzwvcjuaqgthxhw
  VITE_SUPABASE_ANON_KEY = [Your Supabase Anon Key]
  ```

- [ ] **7.13** Get Anon Key from: Supabase Dashboard > Settings > API > `anon public`
- [ ] **7.14** Deploy to staging:
  ```bash
  git push origin develop
  ```

- [ ] **7.15** Wait for Vercel deployment
- [ ] **7.16** Test staging URL (Vercel will provide)

---

### Day 3: Sentry Error Tracking (Wednesday)

- [ ] **7.17** Go to https://sentry.io and create account
- [ ] **7.18** Create new project (React)
- [ ] **7.19** Install Sentry:
  ```bash
  npm install --save @sentry/react
  ```

- [ ] **7.20** Update `src/main.tsx` with Sentry init code (lines 1369-1392)
- [ ] **7.21** Add Sentry DSN to Vercel environment variables:
  ```
  VITE_SENTRY_DSN = [Your Sentry DSN]
  ```

- [ ] **7.22** Test error tracking (trigger test error in dev)
- [ ] **7.23** Verify error appears in Sentry dashboard

---

### Day 4-5: Final Staging Tests (Thursday-Friday)

- [ ] **7.24** Deploy latest code to staging
- [ ] **7.25** Run full E2E test suite manually against staging URL
- [ ] **7.26** Test on different screen sizes (desktop, tablet, mobile)
- [ ] **7.27** Test admin login on staging
- [ ] **7.28** Verify database connections work on staging
- [ ] **7.29** Check Sentry receives errors from staging
- [ ] **7.30** Performance test: Lighthouse audit (target: > 70 score)
- [ ] **7.31** Fix any staging-specific issues

---

## ✅ WEEK 4: Final Validation & Launch

### Day 1-2: User Acceptance Testing (Monday-Tuesday)

- [ ] **8.1** Recruit 5-10 test participants (friends, colleagues)
- [ ] **8.2** Send staging URL + instructions
- [ ] **8.3** Ask participants to complete experiment
- [ ] **8.4** Collect feedback on:
  - Ease of use
  - Any confusing steps
  - Technical issues
  - Browser/device used

- [ ] **8.5** Monitor Sentry for errors during UAT
- [ ] **8.6** Test admin dashboard with real participant data
- [ ] **8.7** Verify demographic filters work correctly
- [ ] **8.8** Check privacy threshold with < 5 and ≥ 5 participants

---

### Day 3: Final Bug Fixes (Wednesday)

- [ ] **8.9** Review all UAT feedback
- [ ] **8.10** Prioritize bugs:
  - Critical (blocks core functionality) → Fix today
  - High (significant UX impact) → Fix today
  - Medium/Low → Document for post-MVP
- [ ] **8.11** Fix critical and high-priority bugs
- [ ] **8.12** Deploy fixes to staging
- [ ] **8.13** Re-test affected flows
- [ ] **8.14** Update documentation with any known issues

---

### Day 4: Production Deployment (Thursday)

#### Pre-Deployment Checklist
- [ ] **8.15** All tests passing (unit + E2E)
- [ ] **8.16** Code coverage ≥ 80%
- [ ] **8.17** Zero critical bugs
- [ ] **8.18** Admin account (john@expectedx.com) working
- [ ] **8.19** Staging validated
- [ ] **8.20** Sentry configured
- [ ] **8.21** Rollback plan documented

#### Production Deployment
- [ ] **8.22** Merge `develop` → `main`:
  ```bash
  git checkout main
  git merge develop
  git push origin main
  ```

- [ ] **8.23** Vercel automatically deploys to production
- [ ] **8.24** Wait for deployment to complete (watch Vercel dashboard)
- [ ] **8.25** Get production URL from Vercel
- [ ] **8.26** Visit production URL - verify loads correctly

#### Production Smoke Tests
- [ ] **8.27** Click "Participant Mode" - should work
- [ ] **8.28** Click "Admin Dashboard" - should show login
- [ ] **8.29** Login as admin - should work
- [ ] **8.30** Check Sentry - should be receiving events
- [ ] **8.31** Complete one participant flow on production
- [ ] **8.32** Verify data appears in admin dashboard

---

### Day 5: Documentation & Monitoring (Friday)

#### Documentation
- [ ] **8.33** Create `USER_GUIDE.md` for participants
- [ ] **8.34** Create `ADMIN_MANUAL.md` with:
  - How to login
  - How to use filters
  - How to interpret sentiment charts
  - Privacy threshold explanation
- [ ] **8.35** Update `README.md` with:
  - Project overview
  - Setup instructions
  - Deployment process
  - Admin account management

#### Monitoring Setup
- [ ] **8.36** Set up Sentry email alerts for critical errors
- [ ] **8.37** Bookmark Vercel dashboard for performance metrics
- [ ] **8.38** Bookmark Supabase dashboard for database monitoring
- [ ] **8.39** Create Google Doc for bug reports/feedback
- [ ] **8.40** Share production URL with stakeholders

#### Post-Launch Monitoring (Next 48 hours)
- [ ] **8.41** Check Sentry every 6 hours for first day
- [ ] **8.42** Monitor participant completion rates
- [ ] **8.43** Check database for data quality issues
- [ ] **8.44** Respond to any critical issues immediately
- [ ] **8.45** Collect initial user feedback

---

## 🎉 MVP LAUNCH COMPLETE!

### Success Criteria Validation
- ✅ Admin authentication working
- ✅ Privacy threshold enforced (≥ 5 users)
- ✅ Database using Supabase PostgreSQL
- ✅ 80% test coverage achieved
- ✅ CI/CD pipeline functional
- ✅ Production deployment successful
- ✅ Zero critical bugs in production

### Next Steps (Post-MVP)
- [ ] Schedule security audit
- [ ] Plan experiment video upload feature
- [ ] Consider multi-experiment support
- [ ] Add data export functionality
- [ ] Implement right-to-be-forgotten API
- [ ] Optimize performance based on real usage
- [ ] Cross-browser testing (Firefox, Safari, Edge)

---

## 📞 Support & Resources

**Supabase Dashboard**: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw
**Vercel Dashboard**: https://vercel.com/dashboard
**Sentry Dashboard**: https://sentry.io
**GitHub Repository**: [Your repo URL]

**Admin Login**:
- Email: john@expectedx.com
- Password: [Securely stored]

**Key Configuration**:
- Retention: 90 days
- Privacy Threshold: 5 participants
- Browser Support: Chrome only (MVP)
- Expected Users: < 10 concurrent

---

**Total Estimated Time**: 15-20 working days (3-4 weeks)
**Current Status**: Ready to start Day 1!
