/**
 * Type definitions for experiment videos and related data structures
 * Updated to include duration verification fields
 */

export interface ExperimentVideo {
  experiment_id: string;
  video_url: string;
  video_name: string;
  duration_seconds: number;
  duration_verified?: boolean;
  duration_measured_at?: string;
  duration_source?: 'manual' | 'auto-detected' | 'verified';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VideoValidationStatus {
  isVerified: boolean;
  actualDuration?: number;
  lastChecked?: Date;
  mismatchDetected: boolean;
  tolerance: number;
}

export interface ExperimentVideoWithValidation extends ExperimentVideo {
  validationStatus?: VideoValidationStatus;
}

// Existing types (keep as-is)
export interface TimeBucket {
  time: number;
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

export interface SentimentDataPoint {
  timestamp: number;
  expressions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
}

export interface DemographicData {
  age?: string;
  gender?: string;
  race?: string;
  ethnicity?: string;
  nationality?: string;
}

export interface UserData {
  userId: string;
  demographics: DemographicData;
  sentiment: SentimentDataPoint[];
}

export interface DemographicFilter {
  age: string;
  gender: string;
  race: string;
  nationality: string;
}

// Duration Analytics Types
export interface AdminDashboardDuration {
  captureId: string;
  userId: string;
  duration: number;
  formattedDuration: string;
  preciseDuration: string;
  demographics: DemographicData;
  recordedAt: string;
}

export interface DurationStatistics {
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  medianDuration: number;
}

export interface DurationDistribution {
  bucket: string;
  count: number;
  percentage: number;
}

export interface DurationAnalytics {
  records: AdminDashboardDuration[];
  statistics: DurationStatistics;
  distribution: DurationDistribution[];
  byDemographics: {
    age: Record<string, { count: number; averageDuration: number }>;
    gender: Record<string, { count: number; averageDuration: number }>;
    race: Record<string, { count: number; averageDuration: number }>;
    nationality: Record<string, { count: number; averageDuration: number }>;
  };
}

// API Response Types
export interface ApiDataItem<T> {
  value: T;
  timestamp?: string;
}

export interface DemographicApiData {
  userId: string;
  age: string;
  gender: string;
  race: string;
  ethnicity: string;
  nationality: string;
}

export interface SentimentApiData {
  userId: string;
  sentimentData: SentimentDataPoint[];
}