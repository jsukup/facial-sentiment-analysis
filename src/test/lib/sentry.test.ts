import { describe, it, expect, vi } from 'vitest';

describe('Sentry Module Basic Tests', () => {
  it('should export required functions', async () => {
    const sentryModule = await import('../../lib/sentry');
    
    expect(sentryModule.monitorFaceDetection).toBeDefined();
    expect(sentryModule.monitorVideoProcessing).toBeDefined();
    expect(sentryModule.reportError).toBeDefined();
    expect(sentryModule.trackUserAction).toBeDefined();
    expect(sentryModule.initSentry).toBeDefined();
    expect(sentryModule.Sentry).toBeDefined();
  });

  it('should have face detection monitoring methods', async () => {
    const { monitorFaceDetection } = await import('../../lib/sentry');
    
    expect(typeof monitorFaceDetection.startDetection).toBe('function');
    expect(typeof monitorFaceDetection.detectionSuccess).toBe('function');
    expect(typeof monitorFaceDetection.detectionError).toBe('function');
  });

  it('should have video processing monitoring methods', async () => {
    const { monitorVideoProcessing } = await import('../../lib/sentry');
    
    expect(typeof monitorVideoProcessing.startRecording).toBe('function');
    expect(typeof monitorVideoProcessing.uploadVideo).toBe('function');
  });

  it('should have error reporting function', async () => {
    const { reportError } = await import('../../lib/sentry');
    
    expect(typeof reportError).toBe('function');
  });

  it('should have user action tracking function', async () => {
    const { trackUserAction } = await import('../../lib/sentry');
    
    expect(typeof trackUserAction).toBe('function');
  });

  it('should handle face detection monitoring gracefully', async () => {
    const { monitorFaceDetection } = await import('../../lib/sentry');
    
    // These should not throw errors
    expect(() => {
      monitorFaceDetection.startDetection();
      monitorFaceDetection.detectionSuccess(3);
      monitorFaceDetection.detectionError(new Error('Test error'));
    }).not.toThrow();
  });

  it('should handle video processing monitoring gracefully', async () => {
    const { monitorVideoProcessing } = await import('../../lib/sentry');
    
    // These should not throw errors
    expect(() => {
      monitorVideoProcessing.startRecording();
      monitorVideoProcessing.uploadVideo(1024);
    }).not.toThrow();
  });

  it('should handle error reporting gracefully', async () => {
    const { reportError } = await import('../../lib/sentry');
    
    // Should not throw errors
    expect(() => {
      reportError(new Error('Test error'));
      reportError(new Error('Test error'), { component: 'test' });
    }).not.toThrow();
  });

  it('should handle user action tracking gracefully', async () => {
    const { trackUserAction } = await import('../../lib/sentry');
    
    // Should not throw errors
    expect(() => {
      trackUserAction('button_click');
      trackUserAction('button_click', { buttonId: 'test' });
    }).not.toThrow();
  });

  it('should handle initialization check', async () => {
    const { initSentry } = await import('../../lib/sentry');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    expect(() => {
      initSentry();
    }).not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalledWith('Sentry initialization check completed');
    
    consoleSpy.mockRestore();
  });

  it('should filter expected face detection errors', async () => {
    const { monitorFaceDetection } = await import('../../lib/sentry');
    
    // These should not throw and should handle expected errors
    expect(() => {
      monitorFaceDetection.detectionError(new Error('No faces detected'));
      monitorFaceDetection.detectionError(new Error('Model not loaded'));
      monitorFaceDetection.detectionError(new Error('face-api initialization failed'));
    }).not.toThrow();
  });

  it('should provide Sentry export', async () => {
    const { Sentry, default: SentryDefault } = await import('../../lib/sentry');
    
    expect(Sentry).toBeDefined();
    expect(SentryDefault).toBeDefined();
    expect(Sentry).toBe(SentryDefault);
  });
});