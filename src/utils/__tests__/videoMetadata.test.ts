/**
 * Test suite for video metadata utilities
 * Tests duration detection and verification functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getVideoDuration, 
  verifyVideoDuration, 
  batchVerifyVideoDurations,
  formatDuration,
  logDurationMismatch 
} from '../videoMetadata';

// Mock console methods for testing
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock HTMLVideoElement
class MockHTMLVideoElement {
  src = '';
  crossOrigin = '';
  preload = '';
  duration = 0;
  videoWidth = 1920;
  videoHeight = 1080;
  
  onloadedmetadata: (() => void) | null = null;
  onerror: ((error?: any) => void) | null = null;

  remove = vi.fn();

  // Simulate successful metadata loading
  simulateLoad(duration: number = 60) {
    this.duration = duration;
    setTimeout(() => {
      if (this.onloadedmetadata) {
        this.onloadedmetadata();
      }
    }, 10);
  }

  // Simulate error loading
  simulateError(error: string = 'Mock error') {
    setTimeout(() => {
      if (this.onerror) {
        this.onerror(error);
      }
    }, 10);
  }
}

// Mock document.createElement
const mockCreateElement = vi.fn();

describe('Video Metadata Utilities', () => {
  beforeEach(() => {
    // Reset mocks
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockCreateElement.mockClear();
    
    // Setup DOM mock
    vi.stubGlobal('document', {
      createElement: mockCreateElement
    });
    
    // Setup performance mock
    vi.stubGlobal('performance', {
      now: () => Date.now()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVideoDuration', () => {
    it('should detect video duration correctly', async () => {
      const mockVideo = new MockHTMLVideoElement();
      mockCreateElement.mockReturnValue(mockVideo);
      
      const durationPromise = getVideoDuration('https://example.com/test-video.mp4');
      mockVideo.simulateLoad(60); // 60 seconds
      
      const duration = await durationPromise;
      expect(duration).toBe(60);
      expect(mockVideo.crossOrigin).toBe('anonymous');
      expect(mockVideo.preload).toBe('metadata');
      expect(mockVideo.remove).toHaveBeenCalled();
    });

    it('should handle video loading errors', async () => {
      const mockVideo = new MockHTMLVideoElement();
      mockCreateElement.mockReturnValue(mockVideo);
      
      const durationPromise = getVideoDuration('https://example.com/invalid-video.mp4');
      mockVideo.simulateError('Failed to load');
      
      await expect(durationPromise).rejects.toThrow('Failed to load video metadata');
      expect(mockVideo.remove).toHaveBeenCalled();
    });

    it('should timeout after specified duration', async () => {
      const mockVideo = new MockHTMLVideoElement();
      mockCreateElement.mockReturnValue(mockVideo);
      
      // Don't simulate load - let it timeout
      const durationPromise = getVideoDuration('https://example.com/slow-video.mp4', 100);
      
      await expect(durationPromise).rejects.toThrow('Video metadata load timeout after 100ms');
      expect(mockVideo.remove).toHaveBeenCalled();
    }, 200);

    it('should reject invalid durations', async () => {
      const mockVideo = new MockHTMLVideoElement();
      mockCreateElement.mockReturnValue(mockVideo);
      
      const durationPromise = getVideoDuration('https://example.com/invalid-duration.mp4');
      mockVideo.simulateLoad(NaN); // Invalid duration
      
      await expect(durationPromise).rejects.toThrow('Invalid video duration detected');
      expect(mockVideo.remove).toHaveBeenCalled();
    });
  });

  describe('verifyVideoDuration', () => {
    it('should verify duration within tolerance', async () => {
      const mockVideo = new MockHTMLVideoElement();
      mockCreateElement.mockReturnValue(mockVideo);
      
      const verificationPromise = verifyVideoDuration('https://example.com/test-video.mp4', 58, 2);
      mockVideo.simulateLoad(60); // Actual: 60s, Expected: 58s, Tolerance: 2s
      
      const result = await verificationPromise;
      expect(result.isValid).toBe(true);
      expect(result.actualDuration).toBe(60);
      expect(result.expectedDuration).toBe(58);
      expect(result.difference).toBe(2);
      expect(result.withinTolerance).toBe(true);
    });

    it('should detect duration mismatch outside tolerance', async () => {
      const mockVideo = new MockHTMLVideoElement();
      mockCreateElement.mockReturnValue(mockVideo);
      
      const verificationPromise = verifyVideoDuration('https://example.com/test-video.mp4', 15, 2);
      mockVideo.simulateLoad(60); // Actual: 60s, Expected: 15s, Tolerance: 2s
      
      const result = await verificationPromise;
      expect(result.isValid).toBe(false);
      expect(result.actualDuration).toBe(60);
      expect(result.expectedDuration).toBe(15);
      expect(result.difference).toBe(45);
      expect(result.withinTolerance).toBe(false);
    });

    it('should handle verification errors gracefully', async () => {
      const mockVideo = new MockHTMLVideoElement();
      mockCreateElement.mockReturnValue(mockVideo);
      
      const verificationPromise = verifyVideoDuration('https://example.com/error-video.mp4', 60, 2);
      mockVideo.simulateError('Network error');
      
      const result = await verificationPromise;
      expect(result.isValid).toBe(false);
      expect(result.actualDuration).toBe(-1);
      expect(result.expectedDuration).toBe(60);
      expect(mockConsoleError).toHaveBeenCalledWith('Duration verification failed:', expect.any(Error));
    });
  });

  describe('batchVerifyVideoDurations', () => {
    it('should verify multiple videos', async () => {
      const mockVideo1 = new MockHTMLVideoElement();
      const mockVideo2 = new MockHTMLVideoElement();
      
      mockCreateElement
        .mockReturnValueOnce(mockVideo1)
        .mockReturnValueOnce(mockVideo2);
      
      const videos = [
        { url: 'https://example.com/video1.mp4', expectedDuration: 60, name: 'Video 1' },
        { url: 'https://example.com/video2.mp4', expectedDuration: 120, name: 'Video 2' }
      ];
      
      const batchPromise = batchVerifyVideoDurations(videos, 2);
      
      // Simulate both videos loading
      mockVideo1.simulateLoad(60); // Exact match
      mockVideo2.simulateLoad(118); // Within tolerance
      
      const results = await batchPromise;
      
      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[0].name).toBe('Video 1');
      expect(results[1].isValid).toBe(true);
      expect(results[1].name).toBe('Video 2');
    });

    it('should handle partial failures in batch', async () => {
      const mockVideo1 = new MockHTMLVideoElement();
      const mockVideo2 = new MockHTMLVideoElement();
      
      mockCreateElement
        .mockReturnValueOnce(mockVideo1)
        .mockReturnValueOnce(mockVideo2);
      
      const videos = [
        { url: 'https://example.com/video1.mp4', expectedDuration: 60 },
        { url: 'https://example.com/video2.mp4', expectedDuration: 120 }
      ];
      
      const batchPromise = batchVerifyVideoDurations(videos);
      
      // One succeeds, one fails
      mockVideo1.simulateLoad(60);
      mockVideo2.simulateError('Network error');
      
      const results = await batchPromise;
      
      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[1].actualDuration).toBe(-1);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(45.7)).toBe('46s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(125)).toBe('2m 5s');
    });

    it('should handle exact minutes', () => {
      expect(formatDuration(120)).toBe('2m');
      expect(formatDuration(300)).toBe('5m');
    });
  });

  describe('logDurationMismatch', () => {
    it('should log formatted duration mismatch', () => {
      logDurationMismatch('Test Video', 15, 60);
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('🎬 Duration Mismatch Detected:')
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Video: Test Video')
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Expected: 15s')
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Actual: 1m')
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Difference: 45s')
      );
    });
  });
});

// Integration test for known Google test videos
describe('Real Video Integration Tests', () => {
  // These tests are skipped by default to avoid network requests during regular testing
  // Uncomment and run separately when needed
  
  it.skip('should detect BigBuckBunny duration correctly', async () => {
    const duration = await getVideoDuration(
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    );
    expect(duration).toBeCloseTo(596, 0); // Should be around 596 seconds
  });

  it.skip('should detect ForBiggerFun actual duration', async () => {
    const duration = await getVideoDuration(
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
    );
    expect(duration).toBeCloseTo(60, 2); // Should be around 60 seconds, not 15
  });
});