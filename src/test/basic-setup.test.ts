import { describe, it, expect, vi } from 'vitest'

describe('Basic Testing Infrastructure', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should support Vitest mocking', () => {
    const mockFn = vi.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })

  it('should have access to environment variables', () => {
    // Test that environment variables are accessible, regardless of specific values
    expect(import.meta.env.VITE_SUPABASE_PROJECT_ID).toBeDefined()
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBeDefined()
    expect(typeof import.meta.env.VITE_SUPABASE_PROJECT_ID).toBe('string')
    expect(typeof import.meta.env.VITE_SUPABASE_ANON_KEY).toBe('string')
  })

  it('should support DOM mocking', () => {
    expect(global.MediaRecorder).toBeDefined()
    expect(global.URL.createObjectURL).toBeDefined()
    expect(global.localStorage).toBeDefined()
  })

  it('should support crypto mocking', () => {
    expect(global.crypto.randomUUID()).toBe('mock-uuid-1234-5678')
  })

  it('should support navigator.mediaDevices mocking', () => {
    expect(navigator.mediaDevices).toBeDefined()
    expect(navigator.mediaDevices.getUserMedia).toBeDefined()
  })
})