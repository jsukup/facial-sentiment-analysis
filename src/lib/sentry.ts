import * as Sentry from "@sentry/react";

// Sentry configuration for facial sentiment analysis app
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.VITE_BUILD_TARGET || 'development';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Initialize Sentry only if DSN is provided
if (SENTRY_DSN && ENV === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    release: `facial-sentiment@${APP_VERSION}`,
    
    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration({
        // Set sampling rates for performance monitoring
        tracePropagationTargets: [
          "localhost",
          /^https:\/\/[^/]*\.supabase\.co/,
          /^https:\/\/[^/]*\.vercel\.app/
        ],
      }),
    ],
    
    // Sample rates
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    sampleRate: 1.0, // Error sampling rate
    
    // Privacy and filtering
    beforeSend(event, hint) {
      // Filter out privacy-sensitive data
      if (event.exception) {
        const error = hint.originalException;
        
        // Don't send face detection model errors (they're expected)
        if (error instanceof Error && error.message.includes('face-api')) {
          return null;
        }
        
        // Don't send webcam permission errors (user choice)
        if (error instanceof Error && error.message.includes('Permission denied')) {
          return null;
        }
      }
      
      // Filter out demographics data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
          return !breadcrumb.message?.includes('demographics') &&
                 !breadcrumb.message?.includes('facial');
        });
      }
      
      return event;
    },
    
    // Security and privacy settings
    attachStacktrace: true,
    autoSessionTracking: true,
    sendDefaultPii: false, // Don't send personally identifiable information
    
    // Development settings
    debug: ENV !== 'production',
    
    // Set user context (without PII)
    beforeSendTransaction(event) {
      // Remove any user-specific data
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    }
  });
  
  // Set initial context
  Sentry.setContext("app", {
    name: "Facial Sentiment Analysis",
    version: APP_VERSION,
    environment: ENV
  });
  
  console.log(`✅ Sentry initialized for ${ENV} environment`);
} else {
  console.log(`ℹ️ Sentry not initialized (DSN: ${!!SENTRY_DSN}, ENV: ${ENV})`);
}

// Utility functions for monitoring face detection performance
export const monitorFaceDetection = {
  startDetection: () => {
    if (ENV === 'production') {
      Sentry.addBreadcrumb({
        message: 'Face detection started',
        category: 'face-api',
        level: 'info'
      });
    }
  },
  
  detectionSuccess: (emotionCount: number) => {
    if (ENV === 'production') {
      Sentry.addBreadcrumb({
        message: `Face detection successful - ${emotionCount} emotions detected`,
        category: 'face-api',
        level: 'info',
        data: { emotionCount }
      });
    }
  },
  
  detectionError: (error: Error) => {
    if (ENV === 'production') {
      // Only report unexpected face detection errors
      if (!error.message.includes('No faces detected') && 
          !error.message.includes('Model not loaded')) {
        Sentry.captureException(error, {
          tags: {
            component: 'face-detection',
            category: 'unexpected-error'
          }
        });
      }
    }
  }
};

// Performance monitoring for video processing
export const monitorVideoProcessing = {
  startRecording: () => {
    return Sentry.startSpan({
      name: 'video-recording',
      op: 'video.record'
    }, () => {});
  },
  
  uploadVideo: (fileSize: number) => {
    return Sentry.startSpan({
      name: 'video-upload',
      op: 'video.upload',
      attributes: { fileSize }
    }, () => {});
  }
};

// Error reporting utilities
export const reportError = (error: Error, context?: Record<string, any>) => {
  if (ENV === 'production') {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('error_context', context);
      }
      Sentry.captureException(error);
    });
  } else {
    console.error('Error (Sentry not active):', error, context);
  }
};

// User action tracking (privacy-safe)
export const trackUserAction = (action: string, properties?: Record<string, any>) => {
  if (ENV === 'production') {
    Sentry.addBreadcrumb({
      message: `User action: ${action}`,
      category: 'user',
      level: 'info',
      data: properties
    });
  }
};

// Initialize Sentry (exported for main.tsx)
export const initSentry = () => {
  // Sentry is automatically initialized above when conditions are met
  console.log('Sentry initialization check completed');
};

// Export Sentry for React error boundary
export { Sentry };
export default Sentry;