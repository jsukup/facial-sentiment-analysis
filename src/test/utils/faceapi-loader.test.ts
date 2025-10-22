import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFaceApiModels, areFaceApiModelsLoaded } from '../../utils/faceapi-loader';

// Mock face-api module
vi.mock('face-api.js', () => ({
  nets: {
    tinyFaceDetector: {
      isLoaded: false,
      loadFromUri: vi.fn()
    },
    faceExpressionNet: {
      isLoaded: false,
      loadFromUri: vi.fn()
    }
  },
  detectAllFaces: vi.fn(),
  matchDimensions: vi.fn(),
  draw: {
    drawDetections: vi.fn(),
    drawFaceExpressions: vi.fn()
  },
  TinyFaceDetectorOptions: vi.fn()
}));

describe('Face API Loader Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset module imports to clear global state
    vi.resetModules();
    
    // Import the mocked module and reset implementations
    const faceapi = await import('face-api.js');
    // Reset isLoaded state
    faceapi.nets.tinyFaceDetector.isLoaded = false;
    faceapi.nets.faceExpressionNet.isLoaded = false;
    // Reset mock implementations
    faceapi.nets.tinyFaceDetector.loadFromUri.mockResolvedValue(undefined);
    faceapi.nets.faceExpressionNet.loadFromUri.mockResolvedValue(undefined);
  });

  describe('loadFaceApiModels', () => {
    it('loads all required models successfully', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels } = await import('../../utils/faceapi-loader');
      
      await loadFaceApiModels();

      expect(faceapi.nets.tinyFaceDetector.loadFromUri).toHaveBeenCalledWith('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
      expect(faceapi.nets.faceExpressionNet.loadFromUri).toHaveBeenCalledWith('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    });

    it('handles model loading failures gracefully', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels } = await import('../../utils/faceapi-loader');
      const error = new Error('Model loading failed');
      faceapi.nets.tinyFaceDetector.loadFromUri.mockRejectedValue(error);

      await expect(loadFaceApiModels()).rejects.toThrow('Model loading failed');
    });

    it('handles partial model loading failures', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels } = await import('../../utils/faceapi-loader');
      faceapi.nets.faceExpressionNet.loadFromUri.mockRejectedValue(new Error('Expression model failed'));

      await expect(loadFaceApiModels()).rejects.toThrow('Expression model failed');
    });

    it('handles network errors during model loading', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels } = await import('../../utils/faceapi-loader');
      const networkError = new Error('Network request failed');
      faceapi.nets.tinyFaceDetector.loadFromUri.mockRejectedValue(networkError);

      await expect(loadFaceApiModels()).rejects.toThrow('Network request failed');
    });

    it('skips loading when models are already loaded', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels } = await import('../../utils/faceapi-loader');
      // Set models as already loaded
      faceapi.nets.tinyFaceDetector.isLoaded = true;
      faceapi.nets.faceExpressionNet.isLoaded = true;

      await loadFaceApiModels();

      // Should not call loadFromUri since models are already loaded
      expect(faceapi.nets.tinyFaceDetector.loadFromUri).not.toHaveBeenCalled();
      expect(faceapi.nets.faceExpressionNet.loadFromUri).not.toHaveBeenCalled();
    });
  });

  describe('areFaceApiModelsLoaded', () => {
    it('returns false when models are not loaded', async () => {
      const { areFaceApiModelsLoaded } = await import('../../utils/faceapi-loader');
      expect(areFaceApiModelsLoaded()).toBe(false);
    });

    it('returns true after models are successfully loaded', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels, areFaceApiModelsLoaded } = await import('../../utils/faceapi-loader');
      
      await loadFaceApiModels();
      
      expect(areFaceApiModelsLoaded()).toBe(true);
    });

    it('returns false after failed model loading', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels, areFaceApiModelsLoaded } = await import('../../utils/faceapi-loader');
      faceapi.nets.tinyFaceDetector.loadFromUri.mockRejectedValue(new Error('Loading failed'));

      try {
        await loadFaceApiModels();
      } catch (error) {
        // Expected to fail
      }

      expect(areFaceApiModelsLoaded()).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete workflow from model loading to status check', async () => {
      const { loadFaceApiModels, areFaceApiModelsLoaded } = await import('../../utils/faceapi-loader');
      
      // Initially not loaded
      expect(areFaceApiModelsLoaded()).toBe(false);

      // Load models
      await loadFaceApiModels();
      
      // Should now be loaded
      expect(areFaceApiModelsLoaded()).toBe(true);
    });

    it('handles repeated loading calls efficiently', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels, areFaceApiModelsLoaded } = await import('../../utils/faceapi-loader');
      
      // First load
      await loadFaceApiModels();
      expect(areFaceApiModelsLoaded()).toBe(true);
      
      // Reset mock call count
      vi.clearAllMocks();
      
      // Second load should not call loadFromUri again
      await loadFaceApiModels();
      expect(faceapi.nets.tinyFaceDetector.loadFromUri).not.toHaveBeenCalled();
      expect(faceapi.nets.faceExpressionNet.loadFromUri).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles concurrent loading calls', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels, areFaceApiModelsLoaded } = await import('../../utils/faceapi-loader');
      
      // Start multiple loading operations concurrently
      const promise1 = loadFaceApiModels();
      const promise2 = loadFaceApiModels();
      const promise3 = loadFaceApiModels();
      
      await Promise.all([promise1, promise2, promise3]);
      
      // Should only load once despite multiple calls
      expect(faceapi.nets.tinyFaceDetector.loadFromUri).toHaveBeenCalledTimes(1);
      expect(faceapi.nets.faceExpressionNet.loadFromUri).toHaveBeenCalledTimes(1);
      expect(areFaceApiModelsLoaded()).toBe(true);
    });

    it('resets state properly after loading failure', async () => {
      const faceapi = await import('face-api.js');
      const { loadFaceApiModels, areFaceApiModelsLoaded } = await import('../../utils/faceapi-loader');
      const error = new Error('Loading failed');
      faceapi.nets.tinyFaceDetector.loadFromUri.mockRejectedValueOnce(error);
      
      // First attempt should fail
      await expect(loadFaceApiModels()).rejects.toThrow('Loading failed');
      expect(areFaceApiModelsLoaded()).toBe(false);
      
      // Reset mock to succeed
      faceapi.nets.tinyFaceDetector.loadFromUri.mockResolvedValue(undefined);
      
      // Second attempt should succeed
      await loadFaceApiModels();
      expect(areFaceApiModelsLoaded()).toBe(true);
    });
  });
});