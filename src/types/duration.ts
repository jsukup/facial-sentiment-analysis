/**
 * TypeScript interfaces for duration-related data structures
 */

export interface WebcamRecordingDuration {
  /** Duration in seconds with decimal precision */
  duration: number;
  /** Recording start timestamp (milliseconds) */
  startTime: number | null;
  /** Recording stop timestamp (milliseconds) */
  stopTime: number | null;
  /** Whether the duration is from actual recording or fallback */
  isFromRecording: boolean;
  /** Source of duration calculation */
  source: 'recording_timestamps' | 'video_element' | 'manual_calculation' | 'fallback';
}

export interface DurationValidationResult {
  /** Validated duration value */
  duration: number;
  /** Whether the duration passed validation */
  isValid: boolean;
  /** Validation error message if invalid */
  error?: string;
  /** Original input value */
  originalValue: number | null | undefined;
  /** Applied validation rules */
  appliedRules: {
    minDuration: number;
    maxDuration: number;
    decimalPlaces: number;
  };
}

export interface VideoUploadDuration {
  /** User ID */
  userId: string;
  /** Capture ID from database */
  captureId?: string;
  /** Webcam recording duration in seconds */
  webcamDuration: number;
  /** Video element duration (fallback) */
  videoDuration?: number;
  /** Experiment video duration for comparison */
  experimentDuration?: number;
  /** Whether duration was validated successfully */
  isValidated: boolean;
  /** Duration source tracking */
  durationSource: WebcamRecordingDuration['source'];
}

export interface DurationStatistics {
  /** Total number of recordings */
  count: number;
  /** Sum of all durations */
  totalDuration: number;
  /** Average recording duration */
  averageDuration: number;
  /** Shortest recording */
  minDuration: number;
  /** Longest recording */
  maxDuration: number;
  /** Median recording duration */
  medianDuration: number;
  /** Standard deviation */
  standardDeviation: number;
}

export interface AdminDashboardDuration {
  /** User identification */
  userId: string;
  /** Recording metadata */
  captureId: string;
  /** Actual webcam recording duration */
  duration: number;
  /** Formatted duration string (MM:SS) */
  formattedDuration: string;
  /** Precise duration string (MM:SS.mmm) */
  preciseDuration: string;
  /** Associated experiment video duration */
  experimentDuration?: number;
  /** Recording efficiency (webcam/experiment ratio) */
  completionRatio?: number;
  /** Recording timestamp */
  recordedAt: string;
}

export interface DurationQueryFilter {
  /** Minimum duration filter */
  minDuration?: number;
  /** Maximum duration filter */
  maxDuration?: number;
  /** Filter by completion ratio */
  minCompletionRatio?: number;
  maxCompletionRatio?: number;
  /** Date range filters */
  startDate?: Date;
  endDate?: Date;
  /** User demographic filters */
  demographics?: {
    age?: string;
    gender?: string;
    race?: string;
    nationality?: string;
  };
}

export interface DurationAnalytics {
  /** Overall statistics */
  overall: DurationStatistics;
  /** Statistics by demographic groups */
  byDemographics: {
    age: Record<string, DurationStatistics>;
    gender: Record<string, DurationStatistics>;
    race: Record<string, DurationStatistics>;
    nationality: Record<string, DurationStatistics>;
  };
  /** Duration distribution buckets */
  distribution: {
    bucket: string; // e.g., "0-30s", "30-60s"
    count: number;
    percentage: number;
  }[];
  /** Completion ratio analysis */
  completionRatios: {
    averageRatio: number;
    highCompletion: number; // >90%
    mediumCompletion: number; // 50-90%
    lowCompletion: number; // <50%
  };
}

export interface DurationLoggingContext {
  /** Component or function name */
  context: string;
  /** User ID for tracking */
  userId?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Error information if applicable */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}