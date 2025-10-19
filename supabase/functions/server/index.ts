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
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Initialize storage bucket on startup
const BUCKET_NAME = 'make-8f45bf92-user-webcapture';
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

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: Deno.env.get('NODE_ENV') === 'production' 
      ? [Deno.env.get('FRONTEND_URL') || 'https://facial-sentiment.vercel.app']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'],
    allowHeaders: ["Content-Type", "Authorization"],
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
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized - Missing or invalid token' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const payload = await verify(token, JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }
};

// Health check endpoint
app.get("/make-server-8f45bf92/health", (c) => {
  return c.json({ status: "ok" });
});

// Admin login endpoint
app.post("/make-server-8f45bf92/admin/login", rateLimit(5, 300000), async (c) => {
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
app.post("/make-server-8f45bf92/demographics", rateLimit(10, 60000), async (c) => {
  try {
    const body = await c.req.json();
    const sanitizedData = validateDemographics(body);
    const { age, race, ethnicity, nationality, gender, otherData } = sanitizedData;

    // Insert into PostgreSQL
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
        facial_analysis_consent: true,
        facial_analysis_consent_timestamp: new Date().toISOString(),
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
app.post("/make-server-8f45bf92/upload-webcam", async (c) => {
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

    // Store metadata in PostgreSQL
    const { error: dbError } = await supabase
      .from('user_webcapture')
      .insert({
        uid: userId,
        video_filename: fileName,
        video_storage_path: data.path,
        video_url: `${BUCKET_NAME}/${data.path}`,
      });

    if (dbError) {
      console.log(`Database error: ${dbError.message}`);
      // Continue even if DB insert fails - video is uploaded
    }

    return c.json({ success: true, fileName, path: data.path });
  } catch (error) {
    console.log(`Error uploading webcam video: ${error}`);
    return c.json({ error: `Failed to upload video: ${error.message}` }, 500);
  }
});

// Store sentiment analysis data
app.post("/make-server-8f45bf92/sentiment", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, sentimentData } = body;

    if (!userId || !sentimentData) {
      return c.json({ error: 'userId and sentimentData are required' }, 400);
    }

    // Store in PostgreSQL
    const { error } = await supabase
      .from('user_sentiment')
      .insert({
        uid: userId,
        sentiment_data: sentimentData,
      });

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to store sentiment: ${error.message}` }, 500);
    }

    return c.json({ success: true, userId });
  } catch (error) {
    console.log(`Error storing sentiment data: ${error}`);
    return c.json({ error: `Failed to store sentiment: ${error.message}` }, 500);
  }
});

// Get all demographics (admin only - with auth check)
app.get("/make-server-8f45bf92/all-demographics", requireAuth, async (c) => {
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

// Get all sentiment data (admin only - with auth check)
app.get("/make-server-8f45bf92/all-sentiment", requireAuth, async (c) => {
  try {
    const { data, error } = await supabase
      .from('user_sentiment')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log(`Database error: ${error.message}`);
      return c.json({ error: `Failed to fetch sentiment: ${error.message}` }, 500);
    }

    return c.json({ sentiment: data });
  } catch (error) {
    console.log(`Error fetching sentiment data: ${error}`);
    return c.json({ error: `Failed to fetch sentiment: ${error.message}` }, 500);
  }
});

// Get signed URL for webcam video (admin only - with auth check)
app.get("/make-server-8f45bf92/webcam-video/:userId", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');

    // Get video metadata from PostgreSQL
    const { data: videoMeta, error: dbError } = await supabase
      .from('user_webcapture')
      .select('video_storage_path')
      .eq('uid', userId)
      .single();

    if (dbError || !videoMeta || !videoMeta.video_storage_path) {
      return c.json({ error: 'Video not found' }, 404);
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(videoMeta.video_storage_path, 3600); // 1 hour expiry

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

Deno.serve(app.fetch);