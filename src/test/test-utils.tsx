import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { vi } from 'vitest'

// Create mock Supabase client for testing
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
  })),
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ 
        data: { signedUrl: 'mock-signed-url' }, 
        error: null 
      }),
    })),
  },
}

// Mock authentication utilities
export const mockAuthUtils = {
  getAdminToken: vi.fn(),
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
  isAdminAuthenticated: vi.fn(() => false),
  authenticatedFetch: vi.fn(),
}

// Mock face-api utilities
export const mockFaceApi = {
  loadFaceApiModels: vi.fn().mockResolvedValue(undefined),
  areFaceApiModelsLoaded: vi.fn(() => true),
  nets: {
    tinyFaceDetector: {
      isLoaded: true,
      loadFromUri: vi.fn().mockResolvedValue(undefined),
    },
    faceExpressionNet: {
      isLoaded: true,
      loadFromUri: vi.fn().mockResolvedValue(undefined),
    },
  },
  detectSingleFace: vi.fn(),
  TinyFaceDetectorOptions: vi.fn(),
}

// Mock logger
export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

// Custom render function with common providers and mocks
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options here if needed
}

export function renderWithMocks(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return render(ui, {
    ...options,
  })
}

// Mock demographic data for testing
export const mockDemographicData = {
  age: '25-34',
  gender: 'Female',
  race: 'Asian',
  ethnicity: 'Not Hispanic or Latino',
  nationality: 'United States',
}

// Mock sentiment data for testing
export const mockSentimentData = [
  {
    timestamp: 0,
    expressions: {
      neutral: 0.8,
      happy: 0.1,
      sad: 0.05,
      angry: 0.02,
      fearful: 0.01,
      disgusted: 0.01,
      surprised: 0.01,
    },
  },
  {
    timestamp: 1,
    expressions: {
      neutral: 0.6,
      happy: 0.3,
      sad: 0.05,
      angry: 0.02,
      fearful: 0.01,
      disgusted: 0.01,
      surprised: 0.01,
    },
  },
]

// Mock user data for admin dashboard testing
export const mockUserData = [
  {
    userId: 'user1',
    demographics: mockDemographicData,
    sentiment: mockSentimentData,
  },
  {
    userId: 'user2', 
    demographics: {
      ...mockDemographicData,
      age: '35-44',
      gender: 'Male',
    },
    sentiment: mockSentimentData,
  },
]

// Helper to wait for async operations in tests
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Re-export everything from @testing-library/react
export * from '@testing-library/react'