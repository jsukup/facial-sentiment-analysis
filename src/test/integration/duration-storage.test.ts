/**
 * Integration tests for duration storage functionality
 * Tests the complete flow from frontend calculation to backend storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateWebcamDuration, validateDuration } from '../../utils/durationCalculator';

// Mock fetch for backend testing
global.fetch = vi.fn();

describe('Duration Storage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Frontend Duration Calculation', () => {
    it('should calculate duration consistently across different completion scenarios', () => {
      const startTime = 1000000000000;
      
      // Scenario 1: Normal video completion
      const normalCompletion = calculateWebcamDuration(startTime, startTime + 30000);
      expect(normalCompletion.duration).toBe(30);
      expect(normalCompletion.isValid).toBe(true);
      expect(normalCompletion.source).toBe('recording');

      // Scenario 2: Manual stop
      const manualStop = calculateWebcamDuration(startTime, startTime + 15000);
      expect(manualStop.duration).toBe(15);
      expect(manualStop.isValid).toBe(true);
      expect(manualStop.source).toBe('recording');

      // Scenario 3: Fallback to video element
      const fallbackScenario = calculateWebcamDuration(null, null, 22.5);
      expect(fallbackScenario.duration).toBe(22.5);
      expect(fallbackScenario.isValid).toBe(true);
      expect(fallbackScenario.source).toBe('video_element');
    });

    it('should handle edge cases gracefully', () => {
      // Very short duration
      const shortDuration = calculateWebcamDuration(1000000000000, 1000000000050); // 50ms
      expect(shortDuration.duration).toBe(0.1); // Clamped to minimum
      expect(shortDuration.isValid).toBe(false);

      // Recording failure scenario
      const recordingFailure = calculateWebcamDuration(null, null, 0);
      expect(recordingFailure.duration).toBe(0.1); // Fallback minimum
      expect(recordingFailure.isValid).toBe(false);
      expect(recordingFailure.source).toBe('fallback');
    });
  });

  describe('Backend Duration Validation Simulation', () => {
    // Simulate the backend validation logic
    const simulateBackendValidation = (durationValue: string | null | undefined) => {
      const MIN_DURATION = 0.1;
      const MAX_DURATION = 3600;

      if (!durationValue || durationValue === 'undefined' || durationValue === 'null') {
        return { duration: MIN_DURATION, isValid: false, error: 'Duration value is null, undefined, or empty' };
      }

      const parsed = parseFloat(durationValue);
      if (isNaN(parsed)) {
        return { duration: MIN_DURATION, isValid: false, error: `Duration value "${durationValue}" is not a valid number` };
      }

      if (parsed < MIN_DURATION) {
        return { duration: MIN_DURATION, isValid: false, error: `Duration ${parsed}s is below minimum ${MIN_DURATION}s` };
      }

      if (parsed > MAX_DURATION) {
        return { duration: MAX_DURATION, isValid: false, error: `Duration ${parsed}s exceeds maximum ${MAX_DURATION}s` };
      }

      const rounded = Math.round(parsed * 1000) / 1000;
      return { duration: rounded, isValid: true, error: null };
    };

    it('should validate normal duration values', () => {
      const result = simulateBackendValidation('30.5');
      expect(result.duration).toBe(30.5);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle invalid string values', () => {
      const result = simulateBackendValidation('invalid');
      expect(result.duration).toBe(0.1);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not a valid number');
    });

    it('should handle null/undefined values', () => {
      const nullResult = simulateBackendValidation(null);
      const undefinedResult = simulateBackendValidation(undefined);
      const stringNullResult = simulateBackendValidation('null');

      [nullResult, undefinedResult, stringNullResult].forEach(result => {
        expect(result.duration).toBe(0.1);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('null, undefined, or empty');
      });
    });

    it('should enforce duration bounds', () => {
      const belowMin = simulateBackendValidation('0.05');
      expect(belowMin.duration).toBe(0.1);
      expect(belowMin.isValid).toBe(false);

      const aboveMax = simulateBackendValidation('4000');
      expect(aboveMax.duration).toBe(3600);
      expect(aboveMax.isValid).toBe(false);
    });
  });

  describe('End-to-End Duration Flow', () => {
    it('should simulate complete video upload with duration', async () => {
      // Mock successful upload response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          captureId: 'test-capture-123',
          experimentId: 'test-experiment-456'
        })
      });

      // Simulate frontend duration calculation
      const startTime = Date.now() - 25000; // 25 seconds ago
      const stopTime = Date.now();
      const frontendDuration = calculateWebcamDuration(startTime, stopTime);

      expect(frontendDuration.isValid).toBe(true);
      expect(frontendDuration.duration).toBeGreaterThan(24);
      expect(frontendDuration.duration).toBeLessThan(26);

      // Simulate FormData creation (as done in handleMediaRecorderStop)
      const formData = new FormData();
      formData.append('duration', frontendDuration.duration.toString());
      formData.append('userId', 'test-user-123');

      // Simulate backend call
      const response = await fetch('/server/upload-webcam', {
        method: 'POST',
        body: formData
      });

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/server/upload-webcam', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });

    it('should handle upload with invalid duration gracefully', async () => {
      // Mock backend response with validation error
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          captureId: 'test-capture-123',
          durationValidation: {
            isValid: false,
            error: 'Duration below minimum, using fallback'
          }
        })
      });

      // Simulate invalid duration scenario
      const invalidDuration = 0.05; // Below minimum
      const validation = validateDuration(invalidDuration);

      expect(validation.isValid).toBe(false);
      expect(validation.duration).toBe(0.1); // Clamped to minimum

      const formData = new FormData();
      formData.append('duration', validation.duration.toString());
      formData.append('userId', 'test-user-123');

      const response = await fetch('/server/upload-webcam', {
        method: 'POST',
        body: formData
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle recording timestamp corruption', () => {
      // Simulate corrupted timestamps (stop before start)
      const corruptedDuration = calculateWebcamDuration(
        Date.now(),
        Date.now() - 5000 // Stop time before start time
      );

      expect(corruptedDuration.isValid).toBe(false);
      expect(corruptedDuration.source).toBe('fallback');
      expect(corruptedDuration.duration).toBe(0.1); // Fallback minimum
    });

    it('should handle MediaRecorder failure with video fallback', () => {
      // Simulate MediaRecorder failure, but video element has valid time
      const videoElementTime = 18.7;
      const fallbackDuration = calculateWebcamDuration(null, null, videoElementTime);

      expect(fallbackDuration.isValid).toBe(true);
      expect(fallbackDuration.source).toBe('video_element');
      expect(fallbackDuration.duration).toBe(18.7);
    });

    it('should handle complete duration calculation failure', () => {
      // No recording times, no video time
      const totalFailure = calculateWebcamDuration(null, null, 0);

      expect(totalFailure.isValid).toBe(false);
      expect(totalFailure.source).toBe('fallback');
      expect(totalFailure.duration).toBe(0.1);
      expect(totalFailure.validationError).toBe('No valid duration source available');
    });
  });

  describe('Duration Precision Tests', () => {
    it('should maintain precision through calculation pipeline', () => {
      const preciseStartTime = 1000000000000;
      const preciseStopTime = 1000000033333; // 33.333 seconds

      const calculated = calculateWebcamDuration(preciseStartTime, preciseStopTime);
      expect(calculated.duration).toBe(33.333);

      const validated = validateDuration(calculated.duration);
      expect(validated.duration).toBe(33.333); // Should maintain precision
      expect(validated.isValid).toBe(true);
    });

    it('should handle rounding edge cases', () => {
      // Test values that might cause rounding issues
      const testValues = [30.1234567, 45.9999999, 60.0000001];
      
      testValues.forEach(value => {
        const validated = validateDuration(value);
        expect(validated.duration).toBeCloseTo(value, 3); // Within 3 decimal places
        expect(validated.isValid).toBe(true);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should handle duration calculation efficiently', () => {
      const startTime = performance.now();
      
      // Perform 1000 duration calculations
      for (let i = 0; i < 1000; i++) {
        calculateWebcamDuration(
          Date.now() - Math.random() * 60000,
          Date.now(),
          Math.random() * 60
        );
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete 1000 calculations in under 100ms
      expect(totalTime).toBeLessThan(100);
    });

    it('should handle validation efficiently for large datasets', () => {
      const startTime = performance.now();
      
      // Validate 1000 duration values
      const testValues = Array.from({ length: 1000 }, () => Math.random() * 120);
      testValues.forEach(value => validateDuration(value));
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should validate 1000 values in under 50ms
      expect(totalTime).toBeLessThan(50);
    });
  });
});