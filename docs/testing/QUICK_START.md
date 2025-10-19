# Quick Start Guide - Testing Setup

**Current Status**: Dependencies installed ✅

---

## Next Steps to Start Testing

### Step 1: Deploy Backend to Supabase Edge Functions

The backend needs to be deployed before you can test. Here's how:

#### Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

#### Deploy Backend

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref spylqvzwvcjuaqgthxhw

# Deploy the server function
supabase functions deploy server

# Set required environment variables
supabase secrets set SUPABASE_URL=https://spylqvzwvcjuaqgthxhw.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

**To get your Service Role Key**:
1. Go to https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/settings/api
2. Copy the `service_role` secret key (not the anon key)

---

### Step 2: Start Frontend Development Server

```bash
npm run dev
```

Expected output:
```
➜  Local:   http://localhost:3000/
```

---

### Step 3: Begin Testing

Open your browser to **http://localhost:3000/** and follow the test scenarios in [TESTING_GUIDE.md](TESTING_GUIDE.md)

**Test Order**:
1. ✅ Test 1: User Registration Flow
2. ✅ Test 2: Webcam Setup
3. ✅ Test 3: Experiment Video Playback
4. ✅ Test 4: Webcam Upload
5. ✅ Test 5: Sentiment Data Submission
6. ✅ Test 6: Admin Login Flow
7. ✅ Test 7: Admin Dashboard Data Display
8. ✅ Test 8: Privacy Threshold Enforcement

---

## Alternative: Local Backend Testing

If you want to test the backend locally first (without deploying):

```bash
# Serve functions locally
supabase functions serve server
```

Then update the API URLs in the frontend to use `http://localhost:54321` instead of the production URL.

---

## Troubleshooting

### Backend Deployment Issues

**Error: Not logged in**
```bash
supabase login
```

**Error: Project not linked**
```bash
supabase link --project-ref spylqvzwvcjuaqgthxhw
```

**Error: Missing environment variables**
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` using `supabase secrets set`

### Frontend Issues

**Port 5173 already in use**
```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9
npm run dev
```

**Dependencies issues**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Quick Health Check

Once backend is deployed and frontend is running:

```bash
# Test backend health endpoint
curl https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/make-server-8f45bf92/health

# Expected response:
# {"status":"ok"}
```

---

## Ready to Test?

Once you have:
- ✅ Backend deployed to Supabase Edge Functions
- ✅ Frontend running on http://localhost:3000/
- ✅ Health endpoint returns `{"status":"ok"}`

You're ready to start testing! Follow [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed test scenarios.
