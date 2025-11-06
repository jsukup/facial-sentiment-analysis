/**
 * Video metadata utilities for accurate duration detection and validation
 * Used to detect actual video durations to fix database discrepancies
 */

export interface VideoMetadata {
  duration: number;
  width?: number;
  height?: number;
  verified: boolean;
  loadTime?: number;
}

export interface DurationValidationResult {
  isValid: boolean;
  expectedDuration: number;
  actualDuration: number;
  difference: number;
  withinTolerance: boolean;
}

/**
 * Get the actual duration of a video from its metadata
 * @param videoUrl - URL of the video to analyze
 * @param timeoutMs - Timeout in milliseconds (default: 10 seconds)
 * @returns Promise resolving to duration in seconds (rounded)
 */
export async function getVideoDuration(
  videoUrl: string, 
  timeoutMs: number = 10000
): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const timeout = setTimeout(() => {
      video.remove();
      reject(new Error(`Video metadata load timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const duration = Math.round(video.duration);
      video.remove();
      
      if (isNaN(duration) || duration <= 0) {
        reject(new Error('Invalid video duration detected'));
        return;
      }
      
      resolve(duration);
    };
    
    video.onerror = (error) => {
      clearTimeout(timeout);
      video.remove();
      reject(new Error(`Failed to load video metadata: ${error}`));
    };
    
    // Handle CORS for external videos
    video.crossOrigin = 'anonymous';
    
    // Set source and trigger loading
    video.src = videoUrl;
  });
}

/**
 * Get comprehensive video metadata including duration, dimensions, and verification status
 * @param videoUrl - URL of the video to analyze
 * @returns Promise resolving to VideoMetadata object
 */
export async function getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  const startTime = performance.now();
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const timeout = setTimeout(() => {
      video.remove();
      reject(new Error('Video metadata load timeout'));
    }, 15000); // Longer timeout for full metadata
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const loadTime = performance.now() - startTime;
      
      const metadata: VideoMetadata = {
        duration: Math.round(video.duration),
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        verified: true,
        loadTime
      };
      
      video.remove();
      resolve(metadata);
    };
    
    video.onerror = () => {
      clearTimeout(timeout);
      video.remove();
      reject(new Error('Failed to load video metadata'));
    };
    
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
  });
}

/**
 * Verify if a video's actual duration matches the expected duration within tolerance
 * @param videoUrl - URL of the video to verify
 * @param expectedDuration - Expected duration in seconds
 * @param tolerance - Allowed difference in seconds (default: 2)
 * @returns Promise resolving to validation result
 */
export async function verifyVideoDuration(
  videoUrl: string, 
  expectedDuration: number, 
  tolerance: number = 2
): Promise<DurationValidationResult> {
  try {
    const actualDuration = await getVideoDuration(videoUrl);
    const difference = Math.abs(actualDuration - expectedDuration);
    const withinTolerance = difference <= tolerance;
    
    return {
      isValid: withinTolerance,
      expectedDuration,
      actualDuration,
      difference,
      withinTolerance
    };
  } catch (error) {
    console.error('Duration verification failed:', error);
    return {
      isValid: false,
      expectedDuration,
      actualDuration: -1,
      difference: -1,
      withinTolerance: false
    };
  }
}

/**
 * Batch verify multiple videos' durations
 * @param videos - Array of objects with url and expectedDuration
 * @param tolerance - Allowed difference in seconds
 * @returns Promise resolving to array of validation results
 */
export async function batchVerifyVideoDurations(
  videos: { url: string; expectedDuration: number; name?: string }[],
  tolerance: number = 2
): Promise<(DurationValidationResult & { name?: string; url: string })[]> {
  const results = await Promise.allSettled(
    videos.map(async (video) => {
      const validation = await verifyVideoDuration(video.url, video.expectedDuration, tolerance);
      return {
        ...validation,
        name: video.name,
        url: video.url
      };
    })
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // Handle failed verification
      return {
        isValid: false,
        expectedDuration: videos[index].expectedDuration,
        actualDuration: -1,
        difference: -1,
        withinTolerance: false,
        name: videos[index].name,
        url: videos[index].url
      };
    }
  });
}

/**
 * Create a temporary video element for duration checking (used internally)
 * @param videoUrl - URL of the video
 * @returns Promise resolving to HTMLVideoElement with loaded metadata
 */
export async function createVideoElement(videoUrl: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      video.remove();
      reject(new Error('Video element creation timeout'));
    }, 10000);
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      resolve(video);
    };
    
    video.onerror = () => {
      clearTimeout(timeout);
      video.remove();
      reject(new Error('Failed to create video element'));
    };
    
    video.src = videoUrl;
  });
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1m 30s" or "45s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Log duration mismatch warning to console with formatting
 * @param videoName - Name of the video
 * @param expected - Expected duration
 * @param actual - Actual duration
 */
export function logDurationMismatch(
  videoName: string, 
  expected: number, 
  actual: number
): void {
  const difference = Math.abs(actual - expected);
  console.warn(
    `🎬 Duration Mismatch Detected:\n` +
    `   Video: ${videoName}\n` +
    `   Expected: ${formatDuration(expected)}\n` +
    `   Actual: ${formatDuration(actual)}\n` +
    `   Difference: ${formatDuration(difference)}`
  );
}