import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { jwt, sign, verify } from "npm:hono/jwt";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// JWT Secret for admin authentication
const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-super-secure-secret-key-change-this-in-production';

// Admin credentials (in production, these should be in environment variables)
const ADMIN_USERNAME = Deno.env.get('ADMIN_USERNAME') || 'admin';
const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'change-this-password';

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? 'https://spylqvzwvcjuaqgthxhw.supabase.co',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Initialize storage bucket on startup
const BUCKET_NAME = 'make-8f45bf92-user-webcapture';
(async () => {
  try {
    console.log('Checking storage buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log(`Error listing buckets: ${listError.message}`);
      return;
    }
    
    console.log('Existing buckets:', buckets?.map(b => b.name) || []);
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { data: bucketData, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 52428800, // 50MB (reduced from 100MB)
      });
      
      if (error) {
        console.log(`Bucket creation error: ${error.message}`);
        console.log('Bucket creation error details:', error);
      } else {
        console.log(`Successfully created bucket: ${BUCKET_NAME}`, bucketData);
      }
    } else {
      console.log(`Bucket ${BUCKET_NAME} already exists`);
    }
  } catch (err) {
    console.log('Storage initialization error:', err);
  }
})();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: Deno.env.get('NODE_ENV') === 'production' 
      ? [
          Deno.env.get('FRONTEND_URL') || 'https://facial-sentiment.vercel.app',
          // Allow all Vercel preview and production URLs for facial-sentiment project
          /^https:\/\/facial-sentiment.*\.vercel\.app$/,
          // Allow the specific Vercel deployment URL from the error
          'https://facial-sentiment-analysis-b04f5d6b3-jsukups-projects.vercel.app'
        ]
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:4173', 'http://localhost:5173'],
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Input validation and sanitization utilities
const sanitizeString = (input: any, maxLength: number = 255): string => {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
};

const validateDemographics = (data: any) => {
  return {
    age: sanitizeString(data.age, 20),
    race: sanitizeString(data.race, 50),
    ethnicity: sanitizeString(data.ethnicity, 50),
    nationality: sanitizeString(data.nationality, 50),
    gender: sanitizeString(data.gender, 20),
    otherData: typeof data.otherData === 'object' ? data.otherData : {}
  };
};

// Enhanced duration validation for video uploads
const validateVideoDuration = (durationValue: string | null | undefined) => {
  const MIN_DURATION = 0.1; // 100ms minimum
  const MAX_DURATION = 3600; // 1 hour maximum
  const DECIMAL_PLACES = 3;

  const result = {
    duration: MIN_DURATION,
    isValid: false,
    error: null as string | null,
    originalValue: durationValue,
    validationDetails: {
      minDuration: MIN_DURATION,
      maxDuration: MAX_DURATION,
      decimalPlaces: DECIMAL_PLACES
    }
  };

  // Check for null/undefined/empty
  if (!durationValue || durationValue === 'undefined' || durationValue === 'null') {
    result.error = 'Duration value is null, undefined, or empty';
    return result;
  }

  // Parse to number
  const parsedDuration = parseFloat(durationValue);
  
  // Check for NaN
  if (isNaN(parsedDuration)) {
    result.error = `Duration value "${durationValue}" is not a valid number`;
    return result;
  }

  // Check minimum bound
  if (parsedDuration < MIN_DURATION) {
    result.duration = MIN_DURATION;
    result.error = `Duration ${parsedDuration}s is below minimum ${MIN_DURATION}s, using minimum`;
    return result;
  }

  // Check maximum bound
  if (parsedDuration > MAX_DURATION) {
    result.duration = MAX_DURATION;
    result.error = `Duration ${parsedDuration}s exceeds maximum ${MAX_DURATION}s, using maximum`;
    return result;
  }

  // Round to specified decimal places
  const roundedDuration = Math.round(parsedDuration * Math.pow(10, DECIMAL_PLACES)) / Math.pow(10, DECIMAL_PLACES);
  
  result.duration = roundedDuration;
  result.isValid = true;
  return result;
};

// Rate limiting store (simple in-memory - in production use Redis)
const rateLimits = new Map();

// Rate limiting middleware
const rateLimit = (maxRequests: number, windowMs: number) => {
  return async (c: any, next: any) => {
    const clientIP = c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimits.has(clientIP)) {
      rateLimits.set(clientIP, []);
    }
    
    const requests = rateLimits.get(clientIP).filter((time: number) => time > windowStart);
    
    if (requests.length >= maxRequests) {
      return c.json({ error: 'Too many requests' }, 429);
    }
    
    requests.push(now);
    rateLimits.set(clientIP, requests);
    await next();
  };
};

// Admin authentication middleware
const requireAuth = async (c: any, next: any) => {
  // For protected endpoints, expect JWT token in X-Admin-Token header
  // Authorization header is reserved for Supabase anon key
  const adminToken = c.req.header('X-Admin-Token');
  
  if (!adminToken) {
    return c.json({ error: 'Unauthorized - Missing admin token' }, 401);
  }
  
  try {
    const payload = await verify(adminToken, JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized - Invalid admin token' }, 401);
  }
};

// Health check endpoint
app.get("/server/health", (c) => {
  return c.json({ status: "ok" });
});

// Admin-only endpoint to clean all user data
app.delete("/server/admin/cleanup-user-data", requireAuth, async (c) => {
  try {
    console.log('Starting user data cleanup...');
    
    // Count existing records before cleanup
    const { count: sentimentCount } = await supabase
      .from('user_sentiment')
      .select('*', { count: 'exact', head: true });
      
    const { count: webcaptureCount } = await supabase
      .from('user_webcapture')
      .select('*', { count: 'exact', head: true });
      
    const { count: demographicsCount } = await supabase
      .from('user_demographics')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Pre-cleanup counts: demographics=${demographicsCount}, webcapture=${webcaptureCount}, sentiment=${sentimentCount}`);
    
    // Delete in correct order to respect foreign key constraints
    
    // Step 1: Delete sentiment data (leaf table)
    const { error: sentimentError } = await supabase
      .from('user_sentiment')
      .delete()
      .neq('sentiment_id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (sentimentError) {
      console.log(`Error deleting sentiment data: ${sentimentError.message}`);
      return c.json({ error: `Failed to delete sentiment data: ${sentimentError.message}` }, 500);
    }
    
    // Step 2: Delete webcapture data (middle table)
    const { error: webcaptureError } = await supabase
      .from('user_webcapture')
      .delete()
      .neq('capture_id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (webcaptureError) {
      console.log(`Error deleting webcapture data: ${webcaptureError.message}`);
      return c.json({ error: `Failed to delete webcapture data: ${webcaptureError.message}` }, 500);
    }
    
    // Step 3: Delete demographics data (root table)
    const { error: demographicsError } = await supabase
      .from('user_demographics')
      .delete()
      .neq('uid', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (demographicsError) {
      console.log(`Error deleting demographics data: ${demographicsError.message}`);
      return c.json({ error: `Failed to delete demographics data: ${demographicsError.message}` }, 500);
    }
    
    // Verify cleanup
    const { count: finalSentimentCount } = await supabase
      .from('user_sentiment')
      .select('*', { count: 'exact', head: true });
      
    const { count: finalWebcaptureCount } = await supabase
      .from('user_webcapture')
      .select('*', { count: 'exact', head: true });
      
    const { count: finalDemographicsCount } = await supabase
      .from('user_demographics')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Post-cleanup counts: demographics=${finalDemographicsCount}, webcapture=${finalWebcaptureCount}, sentiment=${finalSentimentCount}`);
    
    return c.json({ 
      success: true,
      message: 'All user data has been successfully removed',
      deletedCounts: {
        demographics: demographicsCount,
        webcapture: webcaptureCount,
        sentiment: sentimentCount
      },
      finalCounts: {
        demographics: finalDemographicsCount,
        webcapture: finalWebcaptureCount,
        sentiment: finalSentimentCount
      }
    });
    
  } catch (error) {
    console.log(`Error during user data cleanup: ${error}`);
    return c.json({ error: `Cleanup failed: ${error.message}` }, 500);
  }
});

// Admin login endpoint
app.post("/server/admin/login", rateLimit(5, 300000), async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }
    
    // Validate credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Generate JWT token
    const payload = {
      username,
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };
    
    const token = await sign(payload, JWT_SECRET);
    
    return c.json({ 
      success: true, 
      token,
      expiresIn: '24h'
    });
  } catch (error) {
    console.log(`Error during admin login: ${error}`);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Store user demographics
app.post("/server/demographics", rateLimit(10, 60000), async (c) => {
  try {
    const body = await c.req.json();
    const sanitizedData = validateDemographics(body);
    const { age, race, ethnicity, nationality, gender, otherData } = sanitizedData;

    // Insert into PostgreSQL - properly store in user_demographics table
    const { data, error } = await supabase
      .from('user_demographics')
      .insert({
        age,
        gender,
        race,
        ethnicity,
        nationality,
        other_data: otherData,
        consent_timestamp: new Date().toISOString(),
        facial_analysis_consent: true,
        facial_analysis_consent_timestamp: new Date().toISOString(),
      })
      .select('uid')
      .single();

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to store demographics: ${error.message}` }, 500);
    }

    // Return the generated uid from the database
    return c.json({ success: true, userId: data.uid });
  } catch (error) {
    console.log(`Error storing demographics: ${error}`);
    return c.json({ error: `Failed to store demographics: ${error.message}` }, 500);
  }
});

// Upload webcam video
app.post("/server/upload-webcam", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('video') as File;
    const userId = formData.get('userId') as string;
    const experimentIdValue = formData.get('experimentId');
    const experimentId = experimentIdValue && experimentIdValue !== '' ? experimentIdValue as string : null;
    const durationValue = formData.get('duration') as string;
    
    // Enhanced duration validation
    const durationValidation = validateVideoDuration(durationValue);
    const validatedDuration = durationValidation.duration;

    if (!file || !userId) {
      return c.json({ error: 'video file and userId are required' }, 400);
    }
    
    // Enhanced logging for debugging duration issues
    console.log(`📹 Upload webcam request:`, {
      userId: userId,
      experimentId: experimentId || 'null',
      originalDurationValue: durationValue,
      validatedDuration: validatedDuration,
      durationValidation: {
        isValid: durationValidation.isValid,
        error: durationValidation.error,
        validationDetails: durationValidation.validationDetails
      },
      requestTimestamp: new Date().toISOString()
    });
    
    // If no experimentId provided, try to get the default active experiment
    let finalExperimentId = experimentId;
    if (!experimentId) {
      const { data: experiments } = await supabase
        .from('experiment_videos')
        .select('experiment_id')
        .eq('is_active', true)
        .limit(1);
      
      if (experiments && experiments.length > 0) {
        finalExperimentId = experiments[0].experiment_id;
        console.log(`Using default experiment: ${finalExperimentId}`);
      }
    }

    // Ensure bucket exists before upload
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Creating bucket on-demand: ${BUCKET_NAME}`);
      const { error: bucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 52428800, // 50MB (reduced from 100MB)
      });
      
      if (bucketError) {
        console.log(`Bucket creation failed: ${bucketError.message}`);
        return c.json({ error: `Failed to create storage bucket: ${bucketError.message}` }, 500);
      }
      console.log(`Successfully created bucket: ${BUCKET_NAME}`);
    }

    const fileName = `${userId}_${Date.now()}.webm`;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, uint8Array, {
        contentType: 'video/webm',
        upsert: false,
      });

    if (error) {
      console.log(`Storage upload error: ${error.message}`);
      return c.json({ error: `Upload failed: ${error.message}` }, 500);
    }

    // Store metadata in PostgreSQL with validated duration
    console.log(`💾 Storing webcapture metadata:`, {
      userId: userId,
      experiment_id: finalExperimentId || 'null',
      duration_seconds: validatedDuration,
      durationValidation: {
        isValid: durationValidation.isValid,
        error: durationValidation.error,
        originalValue: durationValidation.originalValue
      },
      timestamp: new Date().toISOString()
    });
    
    const insertData = {
      user_uid: userId,
      experiment_id: finalExperimentId || null,
      video_path: data.path,
      video_url: `${BUCKET_NAME}/${data.path}`,
      duration_seconds: validatedDuration, // Use enhanced validated duration
    };
    
    console.log('Webcapture insert data:', JSON.stringify(insertData, null, 2));
    
    const { data: captureData, error: dbError } = await supabase
      .from('user_webcapture')
      .insert(insertData)
      .select('capture_id, experiment_id')
      .single();

    if (dbError) {
      console.log(`❌ Database error: ${dbError.message}`);
      console.log(`❌ Failed insert data:`, JSON.stringify(insertData, null, 2));
      return c.json({ error: `Database error: ${dbError.message}` }, 500);
    }

    // Enhanced logging for successful storage with duration verification
    console.log(`✅ Webcapture stored successfully:`, {
      captureId: captureData.capture_id,
      storedExperimentId: captureData.experiment_id,
      requestedExperimentId: finalExperimentId,
      experimentIdMatches: captureData.experiment_id === finalExperimentId,
      durationSent: validatedDuration,
      durationValidation: {
        isValid: durationValidation.isValid,
        error: durationValidation.error,
        originalValue: durationValidation.originalValue
      },
      insertSuccess: true,
      timestamp: new Date().toISOString()
    });
    
    // Query back the stored record to verify duration_seconds was actually saved
    const { data: verificationData, error: verifyError } = await supabase
      .from('user_webcapture')
      .select('capture_id, duration_seconds, user_uid, experiment_id')
      .eq('capture_id', captureData.capture_id)
      .single();
    
    if (verifyError) {
      console.log(`⚠️ Could not verify stored duration: ${verifyError.message}`);
    } else {
      console.log(`🔍 Duration verification:`, {
        captureId: verificationData.capture_id,
        storedDurationSeconds: verificationData.duration_seconds,
        sentDurationSeconds: validatedDuration,
        durationMatches: verificationData.duration_seconds === validatedDuration,
        durationIsNull: verificationData.duration_seconds === null,
        validationWasSuccessful: durationValidation.isValid,
        verificationTimestamp: new Date().toISOString()
      });
    }

    return c.json({ 
      success: true, 
      fileName, 
      path: data.path, 
      captureId: captureData.capture_id,
      experimentId: captureData.experiment_id // Include in response for debugging
    });
  } catch (error) {
    console.log(`Error uploading webcam video: ${error}`);
    return c.json({ error: `Failed to upload video: ${error.message}` }, 500);
  }
});

// Store sentiment analysis data
app.post("/server/sentiment", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, captureId, sentimentData } = body;

    if (!userId || !sentimentData) {
      return c.json({ error: 'userId and sentimentData are required' }, 400);
    }

    // Handle captureId for early submissions
    let finalCaptureId = captureId;
    
    // For early submissions (manual stop), captureId might be null
    if (!finalCaptureId) {
      // Try to find the most recent capture for this user
      const { data: captureData, error: captureError } = await supabase
        .from('user_webcapture')
        .select('capture_id')
        .eq('user_uid', userId)
        .order('captured_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!captureError && captureData) {
        finalCaptureId = captureData.capture_id;
        console.log(`Using existing capture ID for early submission: ${finalCaptureId}`);
      } else {
        // For early submissions without video capture, store sentiment data without capture reference
        console.log(`Early submission without video capture for user: ${userId}`);
      }
    }

    // Store sentiment data points properly
    console.log(`Attempting to store sentiment data for user: ${userId}`);
    console.log(`Final capture ID: ${finalCaptureId}`);
    console.log(`Sentiment data array length: ${Array.isArray(sentimentData) ? sentimentData.length : 'not array'}`);
    
    if (Array.isArray(sentimentData)) {
      // Batch insert sentiment data points
      const sentimentRecords = sentimentData.map((dataPoint: any) => {
        const emotions = dataPoint.expressions || dataPoint.emotions || dataPoint;
        
        // Convert emotion strings to numbers if needed
        const processedEmotions: any = {};
        if (emotions && typeof emotions === 'object') {
          for (const [key, value] of Object.entries(emotions)) {
            // Convert string values to numbers, keep numbers as-is
            processedEmotions[key] = typeof value === 'string' ? parseFloat(value as string) : value;
          }
        } else {
          processedEmotions = emotions;
        }
        
        return {
          capture_id: finalCaptureId,
          timestamp_seconds: dataPoint.timestamp || dataPoint.time || 0,
          emotions: processedEmotions,
        };
      });

      console.log(`Prepared ${sentimentRecords.length} sentiment records for insertion:`, JSON.stringify(sentimentRecords[0], null, 2));

      const { data: insertResult, error } = await supabase
        .from('user_sentiment')
        .insert(sentimentRecords)
        .select();

      if (error) {
        console.log(`❌ Database error: ${error.message}`);
        console.log(`❌ Error details:`, JSON.stringify(error, null, 2));
        console.log(`❌ Failed records sample:`, JSON.stringify(sentimentRecords.slice(0, 2), null, 2));
        return c.json({ error: `Failed to store sentiment: ${error.message}` }, 500);
      } else {
        console.log(`✅ Successfully inserted ${insertResult?.length || 0} sentiment records`);
        console.log(`✅ Insert result sample:`, JSON.stringify(insertResult?.slice(0, 2) || [], null, 2));
        console.log(`✅ Total sentiment records processed: ${sentimentRecords.length}`);
        
        // Verify the insertion by counting total records
        const { count: totalCount } = await supabase
          .from('user_sentiment')
          .select('*', { count: 'exact', head: true });
        console.log(`✅ Total sentiment records in database: ${totalCount}`);
        
        // Additional verification: Check recent records for this user/session
        const { data: recentRecords, error: verifyError } = await supabase
          .from('user_sentiment')
          .select('sentiment_id, capture_id, timestamp_seconds, emotions, created_at')
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (verifyError) {
          console.log(`⚠️ Verification query failed: ${verifyError.message}`);
        } else {
          console.log(`✅ Recent sentiment records verification:`, JSON.stringify(recentRecords, null, 2));
        }
        
        // Check specifically for records with this capture_id if available
        if (finalCaptureId) {
          const { data: captureSpecific, count: captureCount } = await supabase
            .from('user_sentiment')
            .select('*', { count: 'exact' })
            .eq('capture_id', finalCaptureId);
            
          console.log(`✅ Records for capture_id ${finalCaptureId}: ${captureCount} records`);
          if (captureSpecific && captureSpecific.length > 0) {
            console.log(`✅ Sample record for this capture:`, JSON.stringify(captureSpecific[0], null, 2));
          }
        }
      }
    } else {
      // Single sentiment data point
      const singleRecord = {
        capture_id: finalCaptureId,
        timestamp_seconds: sentimentData.timestamp || sentimentData.time || 0,
        emotions: sentimentData.expressions || sentimentData.emotions || sentimentData,
      };
      
      console.log(`Inserting single sentiment record:`, JSON.stringify(singleRecord, null, 2));

      const { data: insertResult, error } = await supabase
        .from('user_sentiment')
        .insert(singleRecord)
        .select();

      if (error) {
        console.log(`Database error: ${error.message}`);
        console.log(`Error details:`, JSON.stringify(error, null, 2));
        return c.json({ error: `Failed to store sentiment: ${error.message}` }, 500);
      } else {
        console.log(`Successfully inserted single sentiment record:`, JSON.stringify(insertResult, null, 2));
      }
    }
    
    // Verify the insertion by counting records
    const { count: verifyCount, error: countError } = await supabase
      .from('user_sentiment')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log(`Could not verify insertion: ${countError.message}`);
    } else {
      console.log(`Total sentiment records after insertion: ${verifyCount}`);
    }

    return c.json({ success: true, userId, captureId: finalCaptureId });
  } catch (error) {
    console.log(`Error storing sentiment data: ${error}`);
    return c.json({ error: `Failed to store sentiment: ${error.message}` }, 500);
  }
});

// Get all demographics (admin only - with auth check)
app.get("/server/all-demographics", requireAuth, async (c) => {
  try {
    const { data, error } = await supabase
      .from('user_demographics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to fetch demographics: ${error.message}` }, 500);
    }

    // Transform data to match client expectations
    const transformedData = data.map(record => ({
      value: {
        userId: record.uid, // Map uid to userId
        age: record.age,
        gender: record.gender,
        race: record.race,
        ethnicity: record.ethnicity,
        nationality: record.nationality
      }
    }));

    return c.json({ demographics: transformedData });
  } catch (error) {
    console.log(`Error fetching demographics: ${error}`);
    return c.json({ error: `Failed to fetch demographics: ${error.message}` }, 500);
  }
});

// Fix RLS policies (temporary endpoint for debugging)
app.post("/server/fix-rls", async (c) => {
  try {
    console.log('Applying RLS policy fixes...');
    
    // Apply RLS policies using raw SQL
    const sqlCommands = [
      'ALTER TABLE user_sentiment ENABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Public can insert sentiment" ON user_sentiment;',
      'DROP POLICY IF EXISTS "Authenticated users can insert sentiment" ON user_sentiment;',
      'DROP POLICY IF EXISTS "Anonymous users can insert sentiment" ON user_sentiment;',
      `CREATE POLICY "Anonymous users can insert sentiment"
        ON user_sentiment FOR INSERT
        TO anon
        WITH CHECK (true);`,
      `CREATE POLICY "Authenticated users can insert sentiment"
        ON user_sentiment FOR INSERT
        TO authenticated
        WITH CHECK (true);`,
      'GRANT INSERT ON user_sentiment TO anon;',
      'GRANT USAGE ON SCHEMA public TO anon;',
      'GRANT INSERT ON user_sentiment TO authenticated;',
      'GRANT SELECT ON user_sentiment TO authenticated;'
    ];
    
    for (const sql of sqlCommands) {
      console.log(`Executing: ${sql}`);
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.log(`SQL Error: ${error.message}`);
        return c.json({ error: `Failed to execute SQL: ${error.message}` }, 500);
      }
    }
    
    return c.json({ success: true, message: 'RLS policies applied successfully' });
  } catch (error) {
    console.log(`Error applying RLS fixes: ${error}`);
    return c.json({ error: `Failed to apply RLS fixes: ${error.message}` }, 500);
  }
});

// Debug endpoint to check raw sentiment data (admin only)
app.get("/server/sentiment-debug", requireAuth, async (c) => {
  try {
    // First, check if ANY sentiment data exists
    const { data: rawSentiment, error: rawError, count: totalCount } = await supabase
      .from('user_sentiment')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`📊 Raw sentiment data query: ${totalCount} total records`);
    
    if (rawError) {
      console.log(`❌ Raw sentiment query error: ${rawError.message}`);
      return c.json({ 
        error: rawError.message,
        totalCount: 0,
        rawData: [],
        joinedData: []
      });
    }

    // Then try the original complex query
    const { data: joinedData, error: joinError } = await supabase
      .from('user_sentiment')
      .select(`
        *,
        user_webcapture!inner(
          user_uid,
          user_demographics!inner(uid)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`📊 Joined sentiment data: ${joinedData?.length || 0} records`);
    
    if (joinError) {
      console.log(`❌ Joined query error: ${joinError.message}`);
    }

    return c.json({
      totalCount,
      rawDataCount: rawSentiment?.length || 0,
      joinedDataCount: joinedData?.length || 0,
      rawData: rawSentiment || [],
      joinedData: joinedData || [],
      rawError: rawError?.message || null,
      joinError: joinError?.message || null
    });
  } catch (error) {
    console.log(`❌ Debug endpoint error: ${error}`);
    return c.json({ error: `Debug failed: ${error.message}` }, 500);
  }
});

// Get all sentiment data (admin only - with auth check)
app.get("/server/all-sentiment", requireAuth, async (c) => {
  try {
    // First try the complex join query for complete data
    const { data: joinedData, error: joinError } = await supabase
      .from('user_sentiment')
      .select(`
        *,
        user_webcapture!inner(
          user_uid,
          user_demographics!inner(uid)
        )
      `)
      .order('created_at', { ascending: false });

    // If joined query succeeds and has data, use it
    if (!joinError && joinedData && joinedData.length > 0) {
      console.log(`✅ Using joined data: ${joinedData.length} records`);
      
      // Group sentiment data by user and transform to expected format
      const userSentimentMap = new Map();
      
      joinedData.forEach(record => {
        const userId = record.user_webcapture.user_demographics.uid;
        
        if (!userSentimentMap.has(userId)) {
          userSentimentMap.set(userId, []);
        }
        
        // Transform sentiment record to expected format
        userSentimentMap.get(userId).push({
          timestamp: record.timestamp_seconds,
          expressions: record.emotions
        });
      });

      // Transform to client expected format
      const transformedData = Array.from(userSentimentMap.entries()).map(([userId, sentimentData]) => ({
        value: {
          userId: userId,
          sentimentData: sentimentData
        }
      }));

      return c.json({ sentiment: transformedData });
    }

    // Fallback: try to get sentiment data with left joins to handle NULL capture_ids
    console.log(`⚠️ Joined query failed or returned no data, trying fallback approach`);
    console.log(`Join error: ${joinError?.message || 'No error but no data'}`);
    
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('user_sentiment')
      .select(`
        *,
        user_webcapture(
          user_uid,
          user_demographics(uid)
        )
      `)
      .order('created_at', { ascending: false });

    if (fallbackError) {
      console.log(`❌ Fallback query also failed: ${fallbackError.message}`);
      return c.json({ error: `Failed to fetch sentiment: ${fallbackError.message}` }, 500);
    }

    console.log(`📊 Fallback query returned ${fallbackData?.length || 0} records`);

    // Process fallback data, handling NULL captures
    const userSentimentMap = new Map();
    
    fallbackData.forEach(record => {
      let userId = 'unknown';
      
      // Try to get userId from webcapture data
      if (record.user_webcapture && record.user_webcapture.user_demographics) {
        userId = record.user_webcapture.user_demographics.uid;
      } else if (record.user_webcapture && record.user_webcapture.user_uid) {
        userId = record.user_webcapture.user_uid;
      } else {
        // For records without capture_id, create a placeholder
        userId = `no_capture_${record.sentiment_id}`;
      }
      
      if (!userSentimentMap.has(userId)) {
        userSentimentMap.set(userId, []);
      }
      
      // Transform sentiment record to expected format
      userSentimentMap.get(userId).push({
        timestamp: record.timestamp_seconds,
        expressions: record.emotions
      });
    });

    // Transform to client expected format
    const transformedData = Array.from(userSentimentMap.entries()).map(([userId, sentimentData]) => ({
      value: {
        userId: userId,
        sentimentData: sentimentData
      }
    }));

    console.log(`✅ Returning ${transformedData.length} user sentiment datasets`);
    return c.json({ sentiment: transformedData });
  } catch (error) {
    console.log(`Error fetching sentiment data: ${error}`);
    return c.json({ error: `Failed to fetch sentiment: ${error.message}` }, 500);
  }
});

// Get signed URL for webcam video (admin only - with auth check)
app.get("/server/webcam-video/:userId", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');

    // Get video metadata from PostgreSQL - use correct column names
    const { data: videoMeta, error: dbError } = await supabase
      .from('user_webcapture')
      .select('video_path')
      .eq('user_uid', userId)
      .single();

    if (dbError || !videoMeta || !videoMeta.video_path) {
      return c.json({ error: 'Video not found' }, 404);
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(videoMeta.video_path, 3600); // 1 hour expiry

    if (error) {
      console.log(`Error creating signed URL: ${error.message}`);
      return c.json({ error: `Failed to create signed URL: ${error.message}` }, 500);
    }

    return c.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.log(`Error fetching webcam video: ${error}`);
    return c.json({ error: `Failed to fetch video: ${error.message}` }, 500);
  }
});

// Get duration analytics for admin dashboard
app.get("/server/duration-analytics", requireAuth, async (c) => {
  try {
    console.log('📊 Fetching duration analytics for admin dashboard');

    // Get all webcapture records with demographics data
    const { data: webcaptureData, error: webcaptureError } = await supabase
      .from('user_webcapture')
      .select(`
        capture_id,
        user_uid,
        duration_seconds,
        captured_at,
        experiment_id,
        user_demographics!inner(
          uid,
          age,
          gender,
          race,
          nationality
        )
      `)
      .not('duration_seconds', 'is', null)
      .order('captured_at', { ascending: false });

    if (webcaptureError) {
      console.log(`❌ Error fetching webcapture data: ${webcaptureError.message}`);
      return c.json({ error: `Failed to fetch duration data: ${webcaptureError.message}` }, 500);
    }

    console.log(`📈 Found ${webcaptureData?.length || 0} webcapture records with duration data`);

    // Format duration data for admin dashboard
    const durationRecords = webcaptureData.map(record => {
      const duration = record.duration_seconds || 0;
      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };
      
      const formatPreciseTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const secs = Math.floor(remainingSeconds);
        const milliseconds = Math.round((remainingSeconds - secs) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
      };

      return {
        userId: record.user_demographics.uid,
        captureId: record.capture_id,
        duration: duration,
        formattedDuration: formatTime(duration),
        preciseDuration: formatPreciseTime(duration),
        recordedAt: record.captured_at,
        demographics: {
          age: record.user_demographics.age,
          gender: record.user_demographics.gender,
          race: record.user_demographics.race,
          nationality: record.user_demographics.nationality
        }
      };
    });

    // Calculate overall statistics
    const durations = durationRecords.map(r => r.duration).filter(d => d > 0);
    const statistics = {
      count: durations.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      averageDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      medianDuration: durations.length > 0 ? (() => {
        const sorted = [...durations].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      })() : 0
    };

    // Calculate duration distribution buckets
    const distribution = [
      { bucket: '0-15s', count: 0, percentage: 0 },
      { bucket: '15-30s', count: 0, percentage: 0 },
      { bucket: '30-60s', count: 0, percentage: 0 },
      { bucket: '60-120s', count: 0, percentage: 0 },
      { bucket: '120s+', count: 0, percentage: 0 }
    ];

    durations.forEach(duration => {
      if (duration <= 15) distribution[0].count++;
      else if (duration <= 30) distribution[1].count++;
      else if (duration <= 60) distribution[2].count++;
      else if (duration <= 120) distribution[3].count++;
      else distribution[4].count++;
    });

    // Calculate percentages
    const totalRecords = durations.length;
    distribution.forEach(bucket => {
      bucket.percentage = totalRecords > 0 ? (bucket.count / totalRecords) * 100 : 0;
    });

    // Group statistics by demographics
    const byDemographics = {
      age: {},
      gender: {},
      race: {},
      nationality: {}
    };

    const groupStatistics = (records: any[], groupKey: string) => {
      const groups = {};
      records.forEach(record => {
        const groupValue = record.demographics[groupKey];
        if (!groups[groupValue]) {
          groups[groupValue] = [];
        }
        groups[groupValue].push(record.duration);
      });

      const groupStats = {};
      Object.entries(groups).forEach(([key, durations]: [string, number[]]) => {
        const validDurations = durations.filter(d => d > 0);
        if (validDurations.length > 0) {
          groupStats[key] = {
            count: validDurations.length,
            averageDuration: validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length,
            minDuration: Math.min(...validDurations),
            maxDuration: Math.max(...validDurations)
          };
        }
      });
      return groupStats;
    };

    byDemographics.age = groupStatistics(durationRecords, 'age');
    byDemographics.gender = groupStatistics(durationRecords, 'gender');
    byDemographics.race = groupStatistics(durationRecords, 'race');
    byDemographics.nationality = groupStatistics(durationRecords, 'nationality');

    console.log(`📊 Duration analytics prepared:`, {
      totalRecords: durationRecords.length,
      statisticsCount: statistics.count,
      averageDuration: statistics.averageDuration,
      distributionData: distribution
    });

    return c.json({
      records: durationRecords,
      statistics: statistics,
      distribution: distribution,
      byDemographics: byDemographics
    });

  } catch (error) {
    console.log(`❌ Error in duration analytics: ${error.message}`);
    return c.json({ error: `Failed to fetch duration analytics: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);