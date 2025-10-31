/**
 * @jest-environment jsdom
 */

import {
  calculateWebcamDuration,
  validateDuration,
  formatDuration,
  formatPreciseDuration,
  calculateDurationStats,
  logDurationCalculation
} from '../durationCalculator';

describe('Duration Calculator Utils', () => {
  describe('calculateWebcamDuration', () => {
    it('should calculate duration from recording timestamps', () => {
      const startTime = 1000000000000; // Mock timestamp
      const stopTime = 1000000030000; // 30 seconds later
      
      const result = calculateWebcamDuration(startTime, stopTime);
      
      expect(result.duration).toBe(30);
      expect(result.isValid).toBe(true);
      expect(result.source).toBe('recording');
    });

    it('should use current time if stop time not provided', () => {
      const startTime = Date.now() - 5000; // 5 seconds ago
      
      const result = calculateWebcamDuration(startTime);
      
      expect(result.duration).toBeGreaterThan(4);
      expect(result.duration).toBeLessThan(6);
      expect(result.isValid).toBe(true);
      expect(result.source).toBe('recording');
    });

    it('should fall back to video element time when recording time unavailable', () => {
      const fallbackTime = 25.5;
      
      const result = calculateWebcamDuration(null, null, fallbackTime);
      
      expect(result.duration).toBe(25.5);
      expect(result.isValid).toBe(true);
      expect(result.source).toBe('video_element');
    });

    it('should return fallback duration when no valid sources available', () => {
      const result = calculateWebcamDuration(null, null, 0);
      
      expect(result.duration).toBe(0.1); // MIN_DURATION
      expect(result.isValid).toBe(false);
      expect(result.source).toBe('fallback');
      expect(result.validationError).toBe('No valid duration source available');
    });

    it('should handle negative calculated durations', () => {
      const startTime = 1000000030000;
      const stopTime = 1000000000000; // Earlier than start time
      
      const result = calculateWebcamDuration(startTime, stopTime);
      
      expect(result.duration).toBe(0.1); // Should fall back to minimum
      expect(result.isValid).toBe(false);
      expect(result.source).toBe('fallback');
    });
  });

  describe('validateDuration', () => {
    it('should validate normal duration values', () => {
      const result = validateDuration(30.5);
      
      expect(result.duration).toBe(30.5);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle null/undefined values', () => {
      const nullResult = validateDuration(null);
      const undefinedResult = validateDuration(undefined);
      
      expect(nullResult.duration).toBe(0.1);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.error).toBe('Duration is null or undefined');
      
      expect(undefinedResult.duration).toBe(0.1);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.error).toBe('Duration is null or undefined');
    });

    it('should handle NaN values', () => {
      const result = validateDuration(NaN);
      
      expect(result.duration).toBe(0.1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Duration is not a number');
    });

    it('should enforce minimum duration', () => {
      const result = validateDuration(0.05); // Below 0.1s minimum
      
      expect(result.duration).toBe(0.1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Duration 0.05s is below minimum 0.1s');
    });

    it('should enforce maximum duration', () => {
      const result = validateDuration(4000); // Above 3600s maximum
      
      expect(result.duration).toBe(3600);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Duration 4000s exceeds maximum 3600s');
    });

    it('should round to specified decimal places', () => {
      const result = validateDuration(30.123456789);
      
      expect(result.duration).toBe(30.123); // Rounded to 3 decimal places
      expect(result.isValid).toBe(true);
    });

    it('should respect custom validation options', () => {
      const result = validateDuration(0.05, {
        minDuration: 0.01,
        maxDuration: 100,
        decimalPlaces: 2
      });
      
      expect(result.duration).toBe(0.05);
      expect(result.isValid).toBe(true);
    });
  });

  describe('formatDuration', () => {
    it('should format duration in MM:SS format', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(30)).toBe('00:30');
      expect(formatDuration(90)).toBe('01:30');
      expect(formatDuration(3661)).toBe('61:01'); // Over 1 hour
    });

    it('should handle invalid durations', () => {
      expect(formatDuration(-10)).toBe('00:00');
      expect(formatDuration(NaN)).toBe('00:00');
    });
  });

  describe('formatPreciseDuration', () => {
    it('should format duration with milliseconds', () => {
      expect(formatPreciseDuration(30.123)).toBe('00:30.123');
      expect(formatPreciseDuration(90.456)).toBe('01:30.456');
      expect(formatPreciseDuration(3661.789)).toBe('61:01.789');
    });

    it('should handle sub-second durations', () => {
      expect(formatPreciseDuration(0.123)).toBe('00:00.123');
      expect(formatPreciseDuration(0.001)).toBe('00:00.001');
    });
  });

  describe('calculateDurationStats', () => {
    it('should calculate statistics for duration array', () => {
      const durations = [10, 20, 30, 40, 50];
      const stats = calculateDurationStats(durations);
      
      expect(stats.count).toBe(5);
      expect(stats.total).toBe(150);
      expect(stats.average).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.median).toBe(30);
    });

    it('should handle empty array', () => {
      const stats = calculateDurationStats([]);
      
      expect(stats.count).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.median).toBe(0);
    });

    it('should filter out invalid durations', () => {
      const durations = [10, -5, 20, 0, 30]; // -5 and 0 should be filtered
      const stats = calculateDurationStats(durations);
      
      expect(stats.count).toBe(3); // Only 10, 20, 30
      expect(stats.average).toBe(20);
    });

    it('should calculate median for even number of items', () => {
      const durations = [10, 20, 30, 40];
      const stats = calculateDurationStats(durations);
      
      expect(stats.median).toBe(25); // (20 + 30) / 2
    });
  });

  describe('logDurationCalculation', () => {
    it('should log duration calculation without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = {
        duration: 30.5,
        isValid: true,
        source: 'recording' as const
      };
      
      logDurationCalculation(result, 'test-context', { userId: 'test-123' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duration calculation [test-context]:'),
        expect.objectContaining({
          duration: 30.5,
          isValid: true,
          source: 'recording',
          formatted: '00:30',
          precise: '00:30.500',
          userId: 'test-123'
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small durations', () => {
      const result = validateDuration(0.001);
      expect(result.duration).toBe(0.1); // Should clamp to minimum
      expect(result.isValid).toBe(false);
    });

    it('should handle very large durations', () => {
      const result = validateDuration(999999);
      expect(result.duration).toBe(3600); // Should clamp to maximum
      expect(result.isValid).toBe(false);
    });

    it('should handle timestamp calculation edge cases', () => {
      // Test with very close timestamps
      const result = calculateWebcamDuration(1000000000000, 1000000000050); // 50ms
      expect(result.duration).toBe(0.1); // Should be clamped to minimum
      expect(result.isValid).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical webcam recording scenario', () => {
      // Simulate 45-second recording
      const startTime = Date.now() - 45000;
      const stopTime = Date.now();
      
      const result = calculateWebcamDuration(startTime, stopTime);
      
      expect(result.duration).toBeGreaterThan(44);
      expect(result.duration).toBeLessThan(46);
      expect(result.isValid).toBe(true);
      expect(result.source).toBe('recording');
    });

    it('should handle early experiment stop scenario', () => {
      // User stops after 15 seconds, video element shows 15.3s
      const result = calculateWebcamDuration(null, null, 15.3);
      
      expect(result.duration).toBe(15.3);
      expect(result.isValid).toBe(true);
      expect(result.source).toBe('video_element');
    });

    it('should handle MediaRecorder failure scenario', () => {
      // Recording fails, no valid timestamp, video element time available
      const fallbackTime = 28.7;
      const result = calculateWebcamDuration(null, null, fallbackTime);
      
      expect(result.duration).toBe(28.7);
      expect(result.isValid).toBe(true);
      expect(result.source).toBe('video_element');
    });
  });
});