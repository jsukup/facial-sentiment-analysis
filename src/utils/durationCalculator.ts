/**
 * Centralized duration calculation utilities for webcam video recording
 * Provides consistent duration handling across the application
 */

export interface DurationCalculationResult {
  duration: number;
  isValid: boolean;
  source: 'recording' | 'video_element' | 'fallback';
  validationError?: string;
}

export interface DurationValidationOptions {
  minDuration?: number;
  maxDuration?: number;
  decimalPlaces?: number;
}

// Default validation options
const DEFAULT_VALIDATION: Required<DurationValidationOptions> = {
  minDuration: 0.1, // 100ms minimum
  maxDuration: 3600, // 1 hour maximum
  decimalPlaces: 3
};

/**
 * Calculate webcam recording duration from timestamps
 */
export function calculateWebcamDuration(
  recordingStartTime: number | null,
  recordingStopTime?: number | null,
  fallbackVideoTime?: number
): DurationCalculationResult {
  // Primary: Use recording timestamps
  if (recordingStartTime !== null) {
    const stopTime = recordingStopTime || Date.now();
    const calculatedDuration = (stopTime - recordingStartTime) / 1000;
    
    const validation = validateDuration(calculatedDuration);
    if (validation.isValid) {
      return {
        duration: validation.duration,
        isValid: true,
        source: 'recording'
      };
    }
  }

  // Fallback: Use video element currentTime
  if (fallbackVideoTime && fallbackVideoTime > 0) {
    const validation = validateDuration(fallbackVideoTime);
    if (validation.isValid) {
      return {
        duration: validation.duration,
        isValid: true,
        source: 'video_element'
      };
    }
  }

  // Last resort: Return minimal valid duration
  return {
    duration: DEFAULT_VALIDATION.minDuration,
    isValid: false,
    source: 'fallback',
    validationError: 'No valid duration source available'
  };
}

/**
 * Validate and normalize duration value
 */
export function validateDuration(
  duration: number | null | undefined,
  options: DurationValidationOptions = {}
): { duration: number; isValid: boolean; error?: string } {
  const opts = { ...DEFAULT_VALIDATION, ...options };

  // Check for null/undefined
  if (duration === null || duration === undefined) {
    return {
      duration: opts.minDuration,
      isValid: false,
      error: 'Duration is null or undefined'
    };
  }

  // Check for NaN
  if (isNaN(duration)) {
    return {
      duration: opts.minDuration,
      isValid: false,
      error: 'Duration is not a number'
    };
  }

  // Check minimum bound
  if (duration < opts.minDuration) {
    return {
      duration: opts.minDuration,
      isValid: false,
      error: `Duration ${duration}s is below minimum ${opts.minDuration}s`
    };
  }

  // Check maximum bound
  if (duration > opts.maxDuration) {
    return {
      duration: opts.maxDuration,
      isValid: false,
      error: `Duration ${duration}s exceeds maximum ${opts.maxDuration}s`
    };
  }

  // Round to specified decimal places
  const roundedDuration = Math.round(duration * Math.pow(10, opts.decimalPlaces)) / Math.pow(10, opts.decimalPlaces);

  return {
    duration: roundedDuration,
    isValid: true
  };
}

/**
 * Format duration for display (MM:SS format)
 */
export function formatDuration(durationSeconds: number): string {
  if (!durationSeconds || durationSeconds < 0) {
    return '00:00';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format duration with milliseconds for precise display
 */
export function formatPreciseDuration(durationSeconds: number): string {
  if (!durationSeconds || durationSeconds < 0) {
    return '00:00.000';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  const milliseconds = Math.round((durationSeconds % 1) * 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Calculate duration statistics from an array of durations
 */
export function calculateDurationStats(durations: number[]): {
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
  median: number;
} {
  if (durations.length === 0) {
    return {
      count: 0,
      total: 0,
      average: 0,
      min: 0,
      max: 0,
      median: 0
    };
  }

  const validDurations = durations.filter(d => d > 0);
  const sortedDurations = [...validDurations].sort((a, b) => a - b);
  
  const total = validDurations.reduce((sum, d) => sum + d, 0);
  const average = total / validDurations.length;
  
  const medianIndex = Math.floor(sortedDurations.length / 2);
  const median = sortedDurations.length % 2 === 0
    ? (sortedDurations[medianIndex - 1] + sortedDurations[medianIndex]) / 2
    : sortedDurations[medianIndex];

  return {
    count: validDurations.length,
    total: Math.round(total * 1000) / 1000,
    average: Math.round(average * 1000) / 1000,
    min: Math.min(...validDurations),
    max: Math.max(...validDurations),
    median: Math.round(median * 1000) / 1000
  };
}

/**
 * Log duration calculation for debugging
 */
export function logDurationCalculation(
  result: DurationCalculationResult,
  context: string,
  additionalData?: Record<string, any>
): void {
  console.log(`🕐 Duration calculation [${context}]:`, {
    duration: result.duration,
    isValid: result.isValid,
    source: result.source,
    validationError: result.validationError,
    formatted: formatDuration(result.duration),
    precise: formatPreciseDuration(result.duration),
    ...additionalData
  });
}