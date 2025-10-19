# 🚀 START TESTING NOW

Everything is ready! Backend is deployed, dependencies are installed, and you're ready to test.

---

## Quick Start (3 Commands)

```bash
# 1. Start frontend
npm run dev

# 2. Open browser
# http://localhost:3000/

# 3. Start testing!
# Follow the scenarios below
```

---

## Test Scenario 1: Complete User Flow (10 minutes)

### Steps:
1. Open http://localhost:3000/
2. Click **"Start as Participant"**
3. Accept privacy policy
4. Fill demographic form:
   - Age: "25-34"
   - Gender: "Male"
   - Race: "Asian"
   - Ethnicity: "Not Hispanic or Latino"
   - Nationality: "United States"
5. **Allow camera access** when prompted
6. Verify webcam preview shows
7. Click **"Continue"** → Read experiment instructions
8. Click **"Start Experiment"**
9. Watch video play (Big Buck Bunny)
10. Wait for experiment to complete
11. Verify "Thank You" screen displays

### Expected Result:
✅ Complete flow with no errors
✅ Data saved to database

---

## Test Scenario 2: Admin Dashboard (5 minutes)

### Steps:
1. Refresh http://localhost:3000/
2. Click **"Admin Dashboard"**
3. Enter credentials:
   - Email: `john@expectedx.com`
   - Password: [your admin password]
4. Click **"Sign In"**
5. Verify dashboard loads
6. Check participant count (should show at least 1 from previous test)

### Expected Result:
✅ Login successful
✅ Dashboard displays data
✅ If < 5 participants: Warning banner displays, charts hidden
✅ If ≥ 5 participants: No warning, charts visible

---

## Quick Verification Commands

### Check if backend is running:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweWxxdnp3dmNqdWFxZ3RoeGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ3MzgsImV4cCI6MjA3NjA2MDczOH0.2ntz0T5p31sswDYp6RmSK23PnVStC_UC373mbPx3aYk" \
https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/make-server-8f45bf92/health
```
**Expected**: `{"status":"ok"}`

### Watch backend logs (optional):
```bash
npx supabase functions logs server --follow
```

### Check database (optional):
Go to: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/editor

Run:
```sql
SELECT COUNT(*) as participants FROM user_demographics;
SELECT COUNT(*) as sentiment_records FROM user_sentiment;
```

---

## Common Issues & Solutions

### Issue: Camera not working
**Solution**: Grant camera permission in Chrome
- Chrome settings → Privacy and Security → Camera
- Allow for localhost

### Issue: "Network error" in frontend
**Solution**: Check backend is deployed
```bash
# Verify deployment
npx supabase functions list

# Should show: server (deployed)
```

### Issue: Admin login fails
**Solution**: Verify admin user exists
- Check Supabase Dashboard → Authentication → Users
- Ensure john@expectedx.com is created
- Reset password if needed

### Issue: No data in dashboard
**Solution**: Complete at least one participant flow first
- Go through Test Scenario 1 first
- Then check admin dashboard

---

## Full Testing Documentation

For comprehensive testing with all 8 scenarios:
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Complete test plan

For deployment details:
- **[DEPLOYMENT_SUCCESS.md](DEPLOYMENT_SUCCESS.md)** - Backend deployment info
- **[SUPABASE_DEPLOYMENT.md](SUPABASE_DEPLOYMENT.md)** - Supabase CLI reference

---

## Browser Requirements

- **Chrome** (required for MVP)
- Camera permission granted
- Localhost:5173 allowed

---

## What to Test For

### ✅ Success Indicators:
- Privacy modal displays
- Forms validate properly
- Webcam preview works
- Video plays smoothly
- Face detection runs (check console)
- Admin login works
- Dashboard loads data
- Privacy warning displays correctly (<5 users)

### ❌ Failure Indicators:
- Console errors
- Network request failures
- Missing data in dashboard
- Camera access denied
- Video not loading

---

## After Testing

### If Everything Works ✅
Document success and move to Week 1, Days 4-5:
- Frontend deployment to Vercel
- CI/CD setup
- Production validation

### If Issues Found ❌
1. Note the specific error
2. Check browser console
3. Check backend logs: `npx supabase functions logs server`
4. Report issues for troubleshooting

---

## Quick Reference

| Item | Value |
|------|-------|
| **Frontend** | http://localhost:3000/ |
| **Backend** | https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/make-server-8f45bf92 |
| **Dashboard** | https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw |
| **Admin Email** | john@expectedx.com |
| **Browser** | Chrome (required) |

---

# 🎬 Start Now!

```bash
npm run dev
```

Then open http://localhost:3000/ and begin with Test Scenario 1!

Good luck! 🚀
