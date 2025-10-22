import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock face-api.js to avoid browser dependency issues in tests
vi.mock('face-api.js', () => ({
  nets: {
    faceRecognitionNet: {
      loadFromUri: vi.fn().mockResolvedValue(true)
    },
    faceLandmark68Net: {
      loadFromUri: vi.fn().mockResolvedValue(true)
    },
    ssdMobilenetv1: {
      loadFromUri: vi.fn().mockResolvedValue(true)
    },
    faceExpressionNet: {
      loadFromUri: vi.fn().mockResolvedValue(true)
    }
  },
  detectAllFaces: vi.fn().mockResolvedValue([
    {
      expressions: {
        neutral: 0.8,
        happy: 0.1,
        sad: 0.05,
        angry: 0.02,
        fearful: 0.01,
        disgusted: 0.01,
        surprised: 0.01
      }
    }
  ]),
  matchDimensions: vi.fn(),
  draw: {
    drawDetections: vi.fn(),
    drawFaceExpressions: vi.fn()
  }
}))

// Mock MediaDevices API for webcam testing
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    ...window.navigator,
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: vi.fn().mockReturnValue([
          {
            stop: vi.fn(),
            kind: 'video',
            label: 'Mock Camera'
          }
        ])
      }),
      enumerateDevices: vi.fn().mockResolvedValue([])
    }
  }
})

// Mock MediaRecorder API
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive',
  stream: null
})) as any

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock crypto.randomUUID for secure ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-1234-5678')
  }
})

// Mock localStorage with more realistic behavior
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  }),
}
global.localStorage = localStorageMock as any

// Mock IntersectionObserver for chart components
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock ResizeObserver for responsive components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))