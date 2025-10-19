# Rapid MVP Implementation Workflow
## Real-Time Facial Sentiment Analysis Webapp

**Updated**: 2025-10-15
**Strategy**: Rapid MVP from Current State (60% Complete)
**Timeline**: 3-4 Weeks to Production Launch
**Test Coverage Target**: 80%

---

## 🎯 Executive Summary

This workflow takes the **existing 60% complete implementation** and completes the remaining **40% to production-ready MVP** in **3-4 weeks**. The focus is on:

1. ✅ **Critical security & compliance fixes** (admin auth, privacy threshold)
2. ✅ **Database migration** to Supabase PostgreSQL as originally specified
3. ✅ **Essential testing** (80% coverage target)
4. ✅ **Rapid deployment** to production with monitoring

**Post-MVP features** (experiment management, advanced analytics) are deferred to post-launch iterations.

---

## 📊 Starting Position

- **Current Completion**: 60-65%
- **Supabase Project**: `facial_sentiment` (ID: `spylqvzwvcjuaqgthxhw`) ✅ Already provisioned
- **What's Working**: Frontend UI, facial analysis, backend APIs, video storage
- **Critical Gaps**: Database schema, admin auth, testing, deployment infrastructure

---

## 🚀 3-4 WEEK RAPID MVP TIMELINE

### WEEK 1: Critical Fixes & Database Migration
**Goal**: Address security vulnerabilities and migrate to proper database architecture

### WEEK 2: Testing Infrastructure (80% Coverage)
**Goal**: Implement comprehensive test suite for quality assurance

### WEEK 3: Deployment & CI/CD
**Goal**: Production-ready infrastructure with automated deployment

### WEEK 4: Final Validation & Launch
**Goal**: UAT, bug fixes, production deployment, monitoring

---

## 📅 WEEK 1: Security-First Critical Fixes & Database Migration

### Day 1: SECURITY HARDENING (NEW PRIORITY - Critical)

#### 1.0 Secure API Configuration (CRITICAL)
**Addresses Analysis Finding: Exposed API Keys + CORS Security**

**Morning (2-3 hours):**
- [ ] Create `.env.local` file in project root:
  ```env
  VITE_SUPABASE_PROJECT_ID=spylqvzwvcjuaqgthxhw
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- [ ] Update `src/utils/supabase/info.tsx`:
  ```typescript
  // Replace hardcoded values with environment variables
  export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID
  export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  // Add runtime validation
  if (!projectId || !publicAnonKey) {
    throw new Error('Missing required Supabase configuration')
  }
  ```

- [ ] Add `.env.local` to `.gitignore`
- [ ] Create `.env.example` template
- [ ] Verify no hardcoded secrets in build: `npm run build && grep -r "eyJh" dist/`

### Day 1-2: Enhanced Supabase PostgreSQL Schema Setup

#### 1.1 Create Database Schema
**File**: `supabase/migrations/001_initial_schema.sql`

```sql
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
  facial_analysis_consent BOOLEAN DEFAULT false,
  facial_analysis_consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on consent timestamp for filtering
CREATE INDEX idx_user_demographics_consent ON user_demographics(consent_timestamp);

-- Experiment videos table (for future multi-experiment support)
CREATE TABLE experiment_videos (
  experiment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_url TEXT NOT NULL,
  video_name TEXT,
  duration_seconds NUMERIC,
  created_by UUID, -- Future: Link to admin users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- User webcam captures table
CREATE TABLE user_webcapture (
  capture_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID REFERENCES user_demographics(uid) ON DELETE CASCADE,
  experiment_id UUID REFERENCES experiment_videos(experiment_id) ON DELETE SET NULL,
  video_path TEXT NOT NULL, -- Supabase Storage path
  video_url TEXT, -- Signed URL (regenerated on demand)
  duration_seconds NUMERIC,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_uid for faster lookups
CREATE INDEX idx_webcapture_user ON user_webcapture(user_uid);
CREATE INDEX idx_webcapture_experiment ON user_webcapture(experiment_id);

-- User sentiment data table (timestamped emotion data)
CREATE TABLE user_sentiment (
  sentiment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  capture_id UUID REFERENCES user_webcapture(capture_id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC NOT NULL,
  emotions JSONB NOT NULL, -- {happy: 0.8, sad: 0.2, ...}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on capture_id and timestamp for efficient queries
CREATE INDEX idx_sentiment_capture ON user_sentiment(capture_id);
CREATE INDEX idx_sentiment_timestamp ON user_sentiment(capture_id, timestamp_seconds);

-- Admin users table (for authentication)
CREATE TABLE admin_users (
  admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE user_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_webcapture ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Participant data: No direct access (all writes via backend API with service role)
-- Admin access only to authenticated admin users

-- Admin users can read all data
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

-- Service role can do anything (for backend API)
-- This is automatically handled by Supabase service_role key

-- Insert default experiment video (Big Buck Bunny sample)
INSERT INTO experiment_videos (video_url, video_name, duration_seconds)
VALUES (
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'Big Buck Bunny (Sample)',
  596
);
```

**Tasks**:
- [x] Create migration file in `supabase/migrations/`
- [ ] Run migration: `supabase db push` or via Supabase Dashboard SQL Editor
- [ ] Verify tables created in Supabase Dashboard
- [ ] Test foreign key constraints with sample data

#### 1.2 Update Backend API to Use PostgreSQL

**File**: `src/supabase/functions/server/index.tsx`

**Changes Required**:
1. Remove Deno KV imports and usage
2. Use Supabase client for database operations
3. Update all endpoints to use PostgreSQL queries

**Updated Backend Code**:

```typescript
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize storage bucket on startup
const BUCKET_NAME = 'user-webcapture';
(async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 104857600, // 100MB
    });
    if (error) console.log(`Bucket creation error: ${error.message}`);
    else console.log(`Created bucket: ${BUCKET_NAME}`);
  }
})();

// Enable logger and Enhanced CORS (addresses analysis finding)
app.use('*', logger(console.log));
app.use("/*", cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Store user demographics
app.post("/demographics", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, age, race, ethnicity, nationality, gender, otherData } = body;

    // Insert into database (userId becomes uid if client doesn't provide)
    const { data, error } = await supabase
      .from('user_demographics')
      .insert({
        age,
        race,
        ethnicity,
        nationality,
        gender,
        other_data: otherData,
        consent_timestamp: new Date().toISOString(),
      })
      .select('uid')
      .single();

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to store demographics: ${error.message}` }, 500);
    }

    return c.json({ success: true, userId: data.uid });
  } catch (error) {
    console.log(`Error storing demographics: ${error}`);
    return c.json({ error: `Failed to store demographics: ${error.message}` }, 500);
  }
});

// Upload webcam video
app.post("/upload-webcam", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('video') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return c.json({ error: 'video file and userId are required' }, 400);
    }

    const fileName = `${userId}_${Date.now()}.webm`;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, uint8Array, {
        contentType: 'video/webm',
        upsert: false,
      });

    if (uploadError) {
      console.log(`Storage upload error: ${uploadError.message}`);
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    // Get default experiment_id (first active experiment)
    const { data: experiment } = await supabase
      .from('experiment_videos')
      .select('experiment_id')
      .eq('is_active', true)
      .limit(1)
      .single();

    // Store metadata in database
    const { data: captureData, error: dbError } = await supabase
      .from('user_webcapture')
      .insert({
        user_uid: userId,
        experiment_id: experiment?.experiment_id || null,
        video_path: uploadData.path,
      })
      .select('capture_id')
      .single();

    if (dbError) {
      console.log(`Database error: ${dbError.message}`);
      return c.json({ error: `Failed to store metadata: ${dbError.message}` }, 500);
    }

    return c.json({
      success: true,
      fileName,
      path: uploadData.path,
      captureId: captureData.capture_id
    });
  } catch (error) {
    console.log(`Error uploading webcam video: ${error}`);
    return c.json({ error: `Failed to upload video: ${error.message}` }, 500);
  }
});

// Store sentiment analysis data
app.post("/sentiment", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, sentimentData } = body;

    if (!userId || !sentimentData) {
      return c.json({ error: 'userId and sentimentData are required' }, 400);
    }

    // Get capture_id for this user's latest webcam capture
    const { data: capture } = await supabase
      .from('user_webcapture')
      .select('capture_id')
      .eq('user_uid', userId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    if (!capture) {
      return c.json({ error: 'No webcam capture found for user' }, 404);
    }

    // Insert sentiment data points
    const sentimentRecords = sentimentData.map((point: any) => ({
      capture_id: capture.capture_id,
      timestamp_seconds: point.timestamp,
      emotions: point.expressions,
    }));

    const { error } = await supabase
      .from('user_sentiment')
      .insert(sentimentRecords);

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to store sentiment: ${error.message}` }, 500);
    }

    return c.json({ success: true, userId, recordCount: sentimentRecords.length });
  } catch (error) {
    console.log(`Error storing sentiment data: ${error}`);
    return c.json({ error: `Failed to store sentiment: ${error.message}` }, 500);
  }
});

// Get all demographics (admin endpoint - will add auth later)
app.get("/all-demographics", async (c) => {
  try {
    const { data, error } = await supabase
      .from('user_demographics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to fetch demographics: ${error.message}` }, 500);
    }

    return c.json({ demographics: data });
  } catch (error) {
    console.log(`Error fetching demographics: ${error}`);
    return c.json({ error: `Failed to fetch demographics: ${error.message}` }, 500);
  }
});

// Get all sentiment data (admin endpoint - will add auth later)
app.get("/all-sentiment", async (c) => {
  try {
    // Join sentiment with webcapture to get user_uid
    const { data, error } = await supabase
      .from('user_sentiment')
      .select(`
        *,
        user_webcapture!inner(user_uid, experiment_id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to fetch sentiment: ${error.message}` }, 500);
    }

    // Transform data to match expected format for frontend
    const transformedData = data.map(item => ({
      userId: item.user_webcapture.user_uid,
      timestamp: item.timestamp_seconds,
      expressions: item.emotions,
    }));

    return c.json({ sentiment: transformedData });
  } catch (error) {
    console.log(`Error fetching sentiment data: ${error}`);
    return c.json({ error: `Failed to fetch sentiment: ${error.message}` }, 500);
  }
});

// Get aggregated sentiment for admin dashboard with filters
app.post("/admin/aggregated-sentiment", async (c) => {
  try {
    const body = await c.req.json();
    const { filters, experimentId } = body;

    // Build query with demographic filters
    let query = supabase
      .from('user_sentiment')
      .select(`
        timestamp_seconds,
        emotions,
        user_webcapture!inner(
          user_uid,
          experiment_id,
          user_demographics!inner(age, gender, race, nationality)
        )
      `);

    // Apply experiment filter
    if (experimentId) {
      query = query.eq('user_webcapture.experiment_id', experimentId);
    }

    // Apply demographic filters
    if (filters?.age && filters.age !== 'all') {
      query = query.eq('user_webcapture.user_demographics.age', filters.age);
    }
    if (filters?.gender && filters.gender !== 'all') {
      query = query.eq('user_webcapture.user_demographics.gender', filters.gender);
    }
    if (filters?.race && filters.race !== 'all') {
      query = query.eq('user_webcapture.user_demographics.race', filters.race);
    }
    if (filters?.nationality && filters.nationality !== 'all') {
      query = query.eq('user_webcapture.user_demographics.nationality', filters.nationality);
    }

    const { data, error, count } = await query;

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to fetch aggregated data: ${error.message}` }, 500);
    }

    // Check privacy threshold (minimum 5 users)
    const uniqueUsers = new Set(data.map(d => d.user_webcapture.user_uid));
    if (uniqueUsers.size < 5) {
      return c.json({
        error: 'Insufficient participants',
        message: 'At least 5 participants required to view aggregated data',
        userCount: uniqueUsers.size
      }, 403);
    }

    return c.json({
      sentiment: data,
      userCount: uniqueUsers.size
    });
  } catch (error) {
    console.log(`Error fetching aggregated sentiment: ${error}`);
    return c.json({ error: `Failed to fetch aggregated data: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);
```

**Tasks**:
- [ ] Update backend code to use Supabase client
- [ ] Remove all Deno KV imports (`kv_store.tsx`)
- [ ] Test all API endpoints with Postman/Thunder Client
- [ ] Verify data is correctly stored in PostgreSQL tables

#### 1.3 Implement Admin Authentication

**File**: `src/components/AdminLogin.tsx` (NEW)

```typescript
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../utils/supabase/info";

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Verify user is an admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('admin_id')
        .eq('auth_user_id', data.user.id)
        .single();

      if (adminError || !adminData) {
        setError("You do not have admin privileges");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      onLoginSuccess();
    } catch (err) {
      setError("An error occurred during login");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={email}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Update App.tsx** to add authentication flow:

```typescript
// Add new state
const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

// Update admin case in renderContent
case "admin":
  return isAdminAuthenticated ? (
    <AdminDashboard />
  ) : (
    <AdminLogin onLoginSuccess={() => setIsAdminAuthenticated(true)} />
  );
```

**Tasks**:
- [ ] Create `AdminLogin.tsx` component
- [ ] Update `App.tsx` to use authentication flow
- [ ] Test login with admin credentials
- [ ] Verify non-admin users cannot access dashboard

#### 1.4 Privacy Threshold Enforcement

**Update**: `src/components/AdminDashboard.tsx`

Add privacy threshold check before displaying sensitive data:

```typescript
// Add near top of component
const MINIMUM_PARTICIPANT_THRESHOLD = 5;

// Add state for privacy warning
const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);

// Update filteredUserData useEffect
useEffect(() => {
  const filtered = allUserData.filter(/* existing filter logic */);

  setFilteredUserData(filtered);
  setShowPrivacyWarning(filtered.length < MINIMUM_PARTICIPANT_THRESHOLD);
}, [filters, allUserData]);

// Add warning banner in JSX
{showPrivacyWarning && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Insufficient Participants</AlertTitle>
    <AlertDescription>
      At least {MINIMUM_PARTICIPANT_THRESHOLD} participants are required to view aggregated data.
      Current count: {filteredUserData.length}
    </AlertDescription>
  </Alert>
)}

// Conditionally render charts
{!showPrivacyWarning && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Existing charts */}
  </div>
)}
```

**Tasks**:
- [ ] Add privacy threshold constant
- [ ] Implement warning banner
- [ ] Hide charts when threshold not met
- [ ] Test with < 5 filtered participants

---

### Day 3-4: Frontend Database Integration Updates

#### 1.5 Update Frontend API Calls

**Update**: `src/App.tsx`

Change API endpoint paths and response handling:

```typescript
// Update handleDemographicComplete
const handleDemographicComplete = async (data: DemographicData) => {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/demographics`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data), // No need to generate userId client-side
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error storing demographics:", errorData);
      alert("Failed to store demographic data. Please try again.");
      return;
    }

    const result = await response.json();
    setUserId(result.userId); // Use server-generated UUID

    setAppState("webcam-setup");
  } catch (error) {
    console.error("Error submitting demographics:", error);
    alert("An error occurred. Please try again.");
  }
};
```

**Update**: `src/components/AdminDashboard.tsx`

Update data fetching to work with new database structure:

```typescript
// Update fetchData function
const fetchData = async () => {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/all-demographics`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }
    );

    const data = await response.json();

    // Get sentiment data
    const sentimentRes = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/all-sentiment`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }
    );

    const sentimentData = await sentimentRes.json();

    // Combine data by userId
    const combinedData: UserData[] = [];

    if (data.demographics && sentimentData.sentiment) {
      // Group sentiment by userId
      const sentimentByUser = new Map();
      sentimentData.sentiment.forEach((item: any) => {
        if (!sentimentByUser.has(item.userId)) {
          sentimentByUser.set(item.userId, []);
        }
        sentimentByUser.get(item.userId).push({
          timestamp: item.timestamp,
          expressions: item.expressions,
        });
      });

      // Create combined records
      data.demographics.forEach((demo: any) => {
        combinedData.push({
          userId: demo.uid,
          demographics: demo,
          sentiment: sentimentByUser.get(demo.uid) || [],
        });
      });
    }

    setAllUserData(combinedData);
    setFilteredUserData(combinedData);
  } catch (error) {
    console.error("Error fetching admin data:", error);
  }
};
```

**Tasks**:
- [ ] Update all API endpoint URLs
- [ ] Test data flow: participant submit → admin view
- [ ] Verify demographic filters work correctly
- [ ] Test sentiment visualization with real data

#### 1.6 Create Admin User Setup Script

**File**: `scripts/create-admin.sql`

```sql
-- This script creates your first admin user
-- Replace with your actual email and run in Supabase SQL Editor

-- First, create the auth user via Supabase Dashboard > Authentication > Users
-- or using Supabase CLI: supabase auth admin create-user <email>

-- Then, link that auth user to admin_users table
INSERT INTO admin_users (email, auth_user_id)
SELECT
  'your-admin-email@example.com',
  id
FROM auth.users
WHERE email = 'your-admin-email@example.com';
```

**Tasks**:
- [ ] Create admin user in Supabase Dashboard (Authentication > Users)
- [ ] Run SQL script to add user to `admin_users` table
- [ ] Test login with admin credentials
- [ ] Document admin creation process for future admins

---

### Day 5: Testing & Validation

#### 1.7 Manual Testing Checklist

**Participant Flow**:
- [ ] Mode selection works (participant vs admin)
- [ ] Privacy modal displays and accepts/rejects
- [ ] Demographics form submits successfully
- [ ] Webcam permission request works
- [ ] Webcam positioning and preview work
- [ ] Experiment instructions modal displays
- [ ] Video playback starts correctly
- [ ] Facial analysis runs during video (check console logs)
- [ ] Webcam recording synchronizes with video
- [ ] Video upload completes successfully
- [ ] Sentiment data uploads correctly
- [ ] Thank you modal appears after completion

**Admin Flow**:
- [ ] Admin login page appears
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Non-admin users cannot access dashboard
- [ ] Dashboard loads participant data
- [ ] Video playback controls work (play, pause, seek)
- [ ] Sentiment charts display correctly
- [ ] Charts update as video timestamp changes
- [ ] Demographic filters apply correctly
- [ ] Privacy threshold warning shows with < 5 users
- [ ] Charts hidden when privacy threshold not met
- [ ] Participant count displays correctly

**Database Validation**:
- [ ] Check `user_demographics` table has records
- [ ] Check `user_webcapture` table has video paths
- [ ] Check `user_sentiment` table has emotion data
- [ ] Verify foreign key relationships work
- [ ] Test cascading delete (delete demographic → webcapture deleted)
- [ ] Check indexes exist (query performance)

---

## 📅 WEEK 2: Quality-Enhanced Testing (80% Coverage + Technical Debt)

### Day 1-2: Enhanced Unit Testing Setup + Performance Baseline

#### Performance Optimization (NEW - High Priority)
**Addresses Analysis Finding: Large Bundle Size (1.47MB)**

**Day 1 Afternoon: Bundle Analysis**
- [ ] Install bundle analyzer: `npm install --save-dev webpack-bundle-analyzer`
- [ ] Analyze current bundle: `npm run build && npx webpack-bundle-analyzer dist/assets/*.js`
- [ ] Identify largest contributors (face-api.js models, recharts, UI components)
- [ ] Document optimization targets: Bundle <1MB, Load time <3s

**Day 2 Morning: Memory Leak Fixes**
**Addresses Analysis Finding: Memory Leaks in MediaRecorder**

- [ ] Fix MediaRecorder cleanup in `ExperimentView.tsx`:
  ```typescript
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current = null
      }
      chunksRef.current = []
    }
  }, [])
  ```

- [ ] Fix webcam stream cleanup in `WebcamSetup.tsx`
- [ ] Add face-api detection interval cleanup

### Day 1-2: Unit Testing Setup

#### 2.1 Install Testing Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/components/ui/**', // Exclude Shadcn UI components
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**File**: `src/test/setup.ts`

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

#### 2.2 Component Unit Tests

**File**: `src/components/__tests__/PrivacyModal.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyModal } from '../PrivacyModal';

describe('PrivacyModal', () => {
  it('renders privacy modal with accept and reject buttons', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();

    render(<PrivacyModal open={true} onAccept={onAccept} onReject={onReject} />);

    expect(screen.getByText(/privacy/i)).toBeInTheDocument();
    expect(screen.getByText(/accept/i)).toBeInTheDocument();
    expect(screen.getByText(/reject/i)).toBeInTheDocument();
  });

  it('calls onAccept when accept button is clicked', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();

    render(<PrivacyModal open={true} onAccept={onAccept} onReject={onReject} />);

    fireEvent.click(screen.getByText(/accept/i));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onReject when reject button is clicked', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();

    render(<PrivacyModal open={true} onAccept={onAccept} onReject={onReject} />);

    fireEvent.click(screen.getByText(/reject/i));
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
```

**File**: `src/components/__tests__/DemographicForm.test.tsx`
**File**: `src/components/__tests__/ExperimentView.test.tsx`
**File**: `src/components/__tests__/AdminDashboard.test.tsx`

(Similar pattern - test rendering, user interactions, state changes)

#### 2.3 Backend API Tests

**File**: `src/supabase/functions/server/__tests__/api.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const API_BASE = `${SUPABASE_URL}/functions/v1/server`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

describe("Demographics API", () => {
  let testUserId: string;

  it("should store demographics successfully", async () => {
    const response = await fetch(`${API_BASE}/demographics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        age: "25-34",
        gender: "female",
        race: "asian",
        nationality: "US",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.userId).toBeDefined();

    testUserId = data.userId;
  });

  it("should retrieve demographics from database", async () => {
    const { data, error } = await supabase
      .from("user_demographics")
      .select("*")
      .eq("uid", testUserId)
      .single();

    expect(error).toBeNull();
    expect(data.age).toBe("25-34");
    expect(data.gender).toBe("female");
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from("user_demographics").delete().eq("uid", testUserId);
  });
});

describe("Sentiment API", () => {
  // Test sentiment storage and retrieval
});

describe("Admin API", () => {
  // Test aggregated data and privacy threshold
});
```

**Tasks**:
- [ ] Write unit tests for all React components
- [ ] Write API integration tests for backend
- [ ] Achieve 80% code coverage
- [ ] Run tests: `npm run test`
- [ ] Generate coverage report: `npm run test:coverage`

---

### Day 3-4: E2E Testing

#### 2.4 Install Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 2.5 E2E Test Suites

**File**: `e2e/participant-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Participant Flow', () => {
  test('should complete full participant journey', async ({ page, context }) => {
    // Grant webcam permissions
    await context.grantPermissions(['camera']);

    await page.goto('/');

    // Select participant mode
    await page.click('text=Participant Mode');

    // Accept privacy policy
    await expect(page.locator('text=/privacy/i')).toBeVisible();
    await page.click('text=Accept');

    // Fill demographics form
    await page.selectOption('select[name="age"]', '25-34');
    await page.selectOption('select[name="gender"]', 'female');
    await page.selectOption('select[name="race"]', 'asian');
    await page.click('text=Complete');

    // Webcam setup
    await expect(page.locator('video')).toBeVisible();
    await page.click('text=Ready');

    // Experiment instructions
    await expect(page.locator('text=/experiment/i')).toBeVisible();
    await page.click('text=Ready');

    // Video playback (wait for face-api models to load)
    await page.waitForTimeout(5000);
    await page.click('text=Play');

    // Wait for video to complete (or manually stop after a few seconds for testing)
    await page.waitForTimeout(10000);

    // Check thank you modal appears
    await expect(page.locator('text=/thank you/i')).toBeVisible({ timeout: 60000 });
  });
});
```

**File**: `e2e/admin-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test('should require authentication for admin dashboard', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Admin Dashboard');

    // Should see login page
    await expect(page.locator('text=/admin login/i')).toBeVisible();
  });

  test('should login and access dashboard', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Admin Dashboard');

    // Login
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin-password');
    await page.click('text=Login');

    // Should see dashboard
    await expect(page.locator('text=/participants/i')).toBeVisible();
    await expect(page.locator('text=/experiment video/i')).toBeVisible();
  });

  test('should display privacy warning with insufficient participants', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.click('text=Admin Dashboard');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin-password');
    await page.click('text=Login');

    // Check for privacy warning (if < 5 participants)
    const warningVisible = await page.locator('text=/insufficient participants/i').isVisible();

    if (warningVisible) {
      expect(await page.locator('text=/at least 5 participants/i')).toBeVisible();
    }
  });
});
```

**Tasks**:
- [ ] Write E2E tests for participant flow
- [ ] Write E2E tests for admin flow
- [ ] Test cross-browser compatibility (Chrome, Firefox, Safari)
- [ ] Run E2E tests: `npx playwright test`
- [ ] Generate test report: `npx playwright show-report`

---

### Day 5: Integration Testing & Bug Fixes

#### 2.6 Integration Test Scenarios

**Test full data flow**:
1. Participant submits demographics → Verify in database
2. Participant completes experiment → Verify video in storage
3. Sentiment data uploaded → Verify in database
4. Admin views data → Verify aggregation correct
5. Admin applies filters → Verify results match filter criteria

**Tasks**:
- [ ] Test complete data pipeline end-to-end
- [ ] Identify and fix bugs discovered during testing
- [ ] Re-run all tests after bug fixes
- [ ] Achieve 80% code coverage target
- [ ] Document known issues for post-MVP

---

## 📅 WEEK 3: Deployment & CI/CD

### Day 1-2: CI/CD Pipeline Setup

#### 3.1 GitHub Actions Configuration

**File**: `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Run E2E tests
        run: npx playwright test
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Build production bundle
        run: npm run build

      - name: Check build size
        run: du -sh dist/

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

**Tasks**:
- [ ] Create GitHub Actions workflow file
- [ ] Add secrets to GitHub repository (VERCEL_TOKEN, SUPABASE credentials)
- [ ] Test CI pipeline with pull request
- [ ] Verify tests run automatically on commits

---

### Day 3: Staging Environment Setup

#### 3.2 Vercel Deployment Configuration

**File**: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_PROJECT_ID": "@supabase-project-id",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": true
    }
  }
}
```

**Tasks**:
- [ ] Create Vercel account and project
- [ ] Link GitHub repository to Vercel
- [ ] Configure environment variables in Vercel
- [ ] Deploy staging branch (develop) automatically
- [ ] Test staging deployment URL

---

### Day 4-5: Monitoring & Error Tracking

#### 3.3 Sentry Setup for Error Tracking

```bash
npm install --save @sentry/react @sentry/vite-plugin
```

**File**: `src/main.tsx` (updated)

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

#### 3.4 Logging & Analytics

**Add Supabase Realtime for Admin Dashboard** (optional - nice-to-have):

```typescript
// In AdminDashboard.tsx
useEffect(() => {
  const channel = supabase
    .channel('sentiment-updates')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'user_sentiment' },
      (payload) => {
        console.log('New sentiment data:', payload);
        // Refresh data
        fetchData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

**Tasks**:
- [ ] Create Sentry account and project
- [ ] Add Sentry DSN to environment variables
- [ ] Test error tracking (trigger test error)
- [ ] Set up error alerts (email/Slack)
- [ ] Configure performance monitoring

---

## 📅 WEEK 4: Final Validation & Launch

### Day 1-2: User Acceptance Testing (UAT)

#### 4.1 UAT Participant Recruitment

**Tasks**:
- [ ] Recruit 5-10 test participants
- [ ] Provide test instructions and URL
- [ ] Collect feedback on UX and any issues
- [ ] Monitor test sessions for errors

#### 4.2 UAT Admin Testing

**Tasks**:
- [ ] Admin testers review dashboard functionality
- [ ] Validate data accuracy with known test data
- [ ] Test all demographic filter combinations
- [ ] Verify privacy threshold enforcement works

---

### Day 3: Final Bug Fixes & Polish

#### 4.3 Bug Triage & Resolution

**Priority Matrix**:
- **Critical**: Blocks core functionality → Fix immediately
- **High**: Impacts UX significantly → Fix before launch
- **Medium**: Minor UX issues → Document for post-MVP
- **Low**: Nice-to-have improvements → Backlog

**Tasks**:
- [ ] Review all UAT feedback
- [ ] Prioritize bugs by severity
- [ ] Fix critical and high-priority bugs
- [ ] Re-test after fixes
- [ ] Update documentation with known issues

---

### Day 4: Production Deployment

#### 4.4 Production Checklist

**Pre-Deployment**:
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage ≥ 80%
- [ ] Security audit completed (or scheduled post-launch)
- [ ] Admin user accounts created
- [ ] Staging environment validated
- [ ] Rollback plan documented

**Deployment Steps**:
1. [ ] Merge develop → main branch
2. [ ] CI/CD automatically deploys to production
3. [ ] Verify production URL loads correctly
4. [ ] Run smoke tests on production
5. [ ] Monitor Sentry for errors (first 24 hours)

**Post-Deployment**:
- [ ] Announce launch to stakeholders
- [ ] Monitor user activity and errors
- [ ] Be ready for hotfixes if critical issues arise

---

### Day 5: Post-Launch Monitoring & Documentation

#### 4.5 Monitoring Dashboard Setup

**Metrics to Track**:
- Error rate (Sentry)
- Page load time (Vercel Analytics)
- User completion rate (analytics)
- Database query performance (Supabase)
- Storage usage (Supabase)

#### 4.6 Documentation

**Create**:
- [ ] User guide for participants
- [ ] Admin manual (login, filters, interpreting data)
- [ ] Developer README (setup, testing, deployment)
- [ ] API documentation
- [ ] Known issues and workarounds

**Files**:
- `USER_GUIDE.md`
- `ADMIN_MANUAL.md`
- `DEVELOPER_README.md`
- `API_DOCUMENTATION.md`

---

## 🎯 POST-MVP BACKLOG (After Launch)

### Phase 2 Enhancements (Weeks 5-8)

**Experiment Management**:
- [ ] Admin interface to upload experiment videos
- [ ] Multiple experiment support with experiment_id
- [ ] Experiment scheduling and activation

**Advanced Analytics**:
- [ ] Export data to CSV/JSON
- [ ] Heatmaps for peak emotions during video
- [ ] Comparison across experiments

**User Management**:
- [ ] Right-to-be-forgotten implementation (data deletion API)
- [ ] User data download (GDPR requirement)
- [ ] Consent management improvements

**Performance Optimizations**:
- [ ] Video compression optimization
- [ ] Database query optimization
- [ ] Caching strategies for admin dashboard

**Security Enhancements**:
- [ ] Full security audit and penetration testing
- [ ] Rate limiting for API endpoints
- [ ] Admin activity logs
- [ ] Two-factor authentication for admins

---

## 📊 Success Metrics

### MVP Launch Criteria

**Must Have (Launch Blockers)**:
- ✅ Admin authentication working
- ✅ Privacy threshold enforced (≥ 5 users)
- ✅ Database using Supabase PostgreSQL
- ✅ 80% test coverage achieved
- ✅ CI/CD pipeline functional
- ✅ Production deployment successful
- ✅ Zero critical bugs in production

**Should Have (High Priority Post-Launch)**:
- Error monitoring with Sentry
- Cross-browser compatibility validated
- Performance benchmarks met (<3s load time)
- Security audit scheduled

**Nice to Have (Future Iterations)**:
- Experiment video upload
- Advanced data export
- Real-time dashboard updates

---

## 🚨 Risk Management

### Critical Risks

**1. Database Migration Issues**
- **Risk**: Data loss or corruption during Deno KV → PostgreSQL migration
- **Mitigation**: Full backup before migration, test migration in staging first
- **Contingency**: Rollback to Deno KV if critical failure

**2. Test Coverage Below 80%**
- **Risk**: Insufficient testing leads to production bugs
- **Mitigation**: Prioritize critical path testing, use code coverage tools
- **Contingency**: Delay launch until coverage target met

**3. Performance Issues at Scale**
- **Risk**: Slow admin dashboard with many participants
- **Mitigation**: Database indexing, query optimization, load testing
- **Contingency**: Implement caching, optimize queries post-launch

**4. Security Vulnerabilities**
- **Risk**: Data breach or unauthorized access
- **Mitigation**: Admin auth, RLS policies, input validation
- **Contingency**: Immediate security audit if breach suspected

---

## 📞 Next Steps: Socratic Requirements Refinement

Now that we have the Rapid MVP workflow defined, let's refine the remaining requirement gaps with targeted Socratic questions:

---

# 🎓 SOCRATIC REQUIREMENTS REFINEMENT
## Focused Questions for Rapid MVP

Since we're going **Rapid MVP**, I'll focus only on **critical unanswered questions** that block implementation.

### 🔴 CRITICAL: Must Answer Before Development

**DEPLOYMENT & HOSTING**

**Question 1**: Where should the frontend be hosted?
- **Option A**: Vercel (recommended - easy deployment, CDN, analytics included)
- **Option B**: Netlify (similar to Vercel)
- **Option C**: AWS S3 + CloudFront (more complex setup)
- **Your Choice**: Option A

**Question 2**: Where should the backend (Deno server) be hosted?
- **Option A**: Supabase + Edge Functions (keeps everything in Supabase ecosystem)
- **Option B**: Deno Deploy (official Deno hosting)
- **Option C**: Current setup (wherever it's running now)
- **Your Choice**: Option A

---

**PRIVACY & GDPR COMPLIANCE**

**Question 3**: Do you have a **legal-reviewed privacy policy** ready to use?
- **Yes** → Provide document for integration
- **No** → Need legal review (external blocker)
- **Use template for MVP** → Accept risk for demo purposes

**Your Answer**: Use template for MVP

**Question 4**: How long should participant data be retained?
- **Option A**: 90 days (typical research study)
- **Option B**: 1 year
- **Option C**: Indefinitely (until user requests deletion)
- **Your Choice**: Option A

**Question 5**: Should participants be able to request data deletion?
- **Yes** → Need "Delete My Data" button and API endpoint
- **No** → Simpler for MVP but GDPR risk
- **Post-MVP** → Add later

**Your Answer**: Post-MVP

---

**ADMIN ACCESS**

**Question 6**: Who should have admin access initially?
- Provide **email addresses** for initial admin users: john@expectedx.com

**Question 7**: Should there be multiple admin roles (e.g., super admin vs viewer)?
- **Yes** → Define roles and permissions
- **No** → All admins have full access (simpler for MVP)

**Your Answer**: No

---

**EXPERIMENT VIDEO**

**Question 8**: For MVP, will you use the **hardcoded Big Buck Bunny video** or a custom video?
- **Hardcoded is fine** → No changes needed
- **Custom video** → Provide video URL or upload to Supabase Storage

**Your Answer**: Hardcoded is fine

**Question 9**: Do you need multi-experiment support for MVP?
- **No** → Use single default experiment (simpler)
- **Yes** → Need experiment management interface (adds 2-3 days)

**Your Answer**: No

---

**TESTING SCOPE**

**Question 10**: What browsers must be supported for MVP?
- **All modern browsers** (Chrome, Firefox, Safari, Edge) → Full cross-browser testing
- **Chrome only** → Faster MVP
- **Chrome + one other** → Balanced approach

**Your Answer**: Chrome only

**Question 11**: Should E2E tests run in CI/CD or manual only?
- **Automated in CI** → Slower pipeline but higher confidence
- **Manual before deployment** → Faster MVP

**Your Answer**: Manual before deployment

---

**SECURITY**

**Question 12**: Is external security audit required before launch?
- **Yes** → Need to schedule (may delay MVP)
- **No** → Accept risk for demo MVP
- **Post-launch** → Launch first, audit later

**Your Answer**: No

---

### 🟡 IMPORTANT: Nice to Know for MVP

**Question 13**: Do you want analytics/tracking beyond error monitoring?
- **Yes** → Google Analytics, Mixpanel, etc.
- **No** → Just Sentry for errors

**Your Answer**: No

**Question 14**: Should the admin dashboard update in real-time as new participants complete experiments?
- **Yes** → WebSocket/Supabase Realtime integration
- **No** → Manual refresh required (simpler)

**Your Answer**: No

**Question 15**: What's the expected number of concurrent participants during pilot?
- **< 10** → No performance concerns
- **10-50** → Standard setup adequate
- **50+** → May need performance optimization

**Your Answer**: < 10

---

## 📋 IMPLEMENTATION DECISION SUMMARY

Once you answer these questions, I'll:

1. **Update the Rapid MVP Workflow** with your specific configuration
2. **Generate exact implementation code** for database schema, backend APIs, deployment configs
3. **Create step-by-step tasks** with effort estimates
4. **Provide deployment scripts** for your chosen hosting platforms

**Ready to answer these questions?** Or would you like me to proceed with **reasonable defaults** for a typical research demo MVP?

### Recommended Defaults (if you want to move fast):

```yaml
deployment:
  frontend: Vercel
  backend: Supabase Edge Functions

privacy:
  policy: Template for demo (legal review post-MVP)
  retention: 90 days
  deletion_api: Post-MVP

admin:
  initial_admin: [your-email@example.com]
  roles: Single admin role (all permissions)

experiment:
  video: Hardcoded Big Buck Bunny
  multi_experiment: No (single experiment for MVP)

testing:
  browsers: Chrome + Firefox
  e2e_ci: Manual before deployment

security:
  external_audit: Post-launch

analytics:
  tracking: Sentry only (errors)
  realtime_dashboard: No (manual refresh)

performance:
  expected_users: < 20 concurrent
```

**Should I proceed with these defaults, or do you want to customize?**
