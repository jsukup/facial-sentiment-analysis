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
    expect(import.meta.env.VITE_SUPABASE_PROJECT_ID).toBe('test_project_id')
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBe('test_anon_key')
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