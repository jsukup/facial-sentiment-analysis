// Health check endpoint for deployment validation
export default function handler(req, res) {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    services: {
      frontend: 'operational',
      supabase: checkSupabaseHealth(),
      sentry: checkSentryHealth()
    },
    performance: {
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  // Set cache headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Return health status
  res.status(200).json(healthStatus);
}

function checkSupabaseHealth() {
  try {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!projectId || !anonKey) {
      return 'configuration_missing';
    }
    
    if (projectId.includes('test') || projectId.includes('mock')) {
      return 'test_mode';
    }
    
    return 'configured';
  } catch (error) {
    return 'error';
  }
}

function checkSentryHealth() {
  try {
    const sentryDsn = process.env.VITE_SENTRY_DSN;
    return sentryDsn ? 'configured' : 'not_configured';
  } catch (error) {
    return 'error';
  }
}