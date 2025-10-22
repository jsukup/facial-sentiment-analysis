import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  isAdminAuthenticated, 
  getAdminToken, 
  clearAdminToken, 
  authenticatedFetch,
  getApiBaseUrl 
} from '../../utils/auth';

describe('Auth Utility Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('isAdminAuthenticated', () => {
    it('returns false when no token exists', () => {
      expect(isAdminAuthenticated()).toBe(false);
    });

    it('returns false when token exists but is expired', () => {
      const expiredTime = Date.now() - 1000; // 1 second ago
      localStorage.setItem('adminToken', 'mock-token');
      localStorage.setItem('adminTokenExpiry', expiredTime.toString());
      
      expect(isAdminAuthenticated()).toBe(false);
    });

    it('returns true when valid token exists and not expired', () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      localStorage.setItem('adminToken', 'mock-token');
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      expect(isAdminAuthenticated()).toBe(true);
    });

    it('returns false when token exists but expiry is missing', () => {
      localStorage.setItem('adminToken', 'mock-token');
      
      expect(isAdminAuthenticated()).toBe(false);
    });

    it('returns false when expiry exists but token is missing', () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      expect(isAdminAuthenticated()).toBe(false);
    });
  });

  describe('getAdminToken', () => {
    it('returns null when no token exists', () => {
      expect(getAdminToken()).toBe(null);
    });

    it('returns null when token is expired', () => {
      const expiredTime = Date.now() - 1000;
      localStorage.setItem('adminToken', 'mock-token');
      localStorage.setItem('adminTokenExpiry', expiredTime.toString());
      
      expect(getAdminToken()).toBe(null);
    });

    it('returns token when valid and not expired', () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      expect(getAdminToken()).toBe('valid-token');
    });
  });

  describe('clearAdminToken', () => {
    it('removes both token and expiry from localStorage', () => {
      localStorage.setItem('adminToken', 'token-to-remove');
      localStorage.setItem('adminTokenExpiry', '12345');
      
      clearAdminToken();
      
      expect(localStorage.getItem('adminToken')).toBe(null);
      expect(localStorage.getItem('adminTokenExpiry')).toBe(null);
    });

    it('works when no token exists', () => {
      // Should not throw error
      expect(() => clearAdminToken()).not.toThrow();
    });
  });

  describe('getApiBaseUrl', () => {
    it('returns environment variable when set', () => {
      // Mock environment variable
      vi.stubEnv('VITE_API_BASE_URL', 'https://custom-api.example.com');
      
      expect(getApiBaseUrl()).toBe('https://custom-api.example.com');
    });

    it('returns default URL when environment variable not set', () => {
      vi.unstubAllEnvs();
      
      const defaultUrl = getApiBaseUrl();
      expect(defaultUrl).toContain('supabase.co/functions/v1');
    });
  });

  describe('authenticatedFetch', () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('includes Authorization header when authenticated', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'success' })
      });

      await authenticatedFetch('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
    });

    it('throws error when not authenticated', async () => {
      await expect(authenticatedFetch('/test-endpoint')).rejects.toThrow('No authentication token available');
    });

    it('merges custom headers with auth header', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'success' })
      });

      await authenticatedFetch('/test-endpoint', {
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'custom-value'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json',
            'Custom-Header': 'custom-value'
          })
        })
      );
    });

    it('handles POST requests with body', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'success' })
      });

      const requestBody = { test: 'data' };
      await authenticatedFetch('/test-endpoint', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
    });

    it('returns fetch response as-is', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test-response' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await authenticatedFetch('/test-endpoint');

      expect(result).toBe(mockResponse);
    });

    it('handles 401 unauthorized responses', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      mockFetch.mockResolvedValue({
        status: 401,
        ok: false
      });

      await expect(authenticatedFetch('/test-endpoint')).rejects.toThrow('Authentication failed - please login again');
      
      // Should clear tokens after 401
      expect(localStorage.getItem('adminToken')).toBe(null);
      expect(localStorage.getItem('adminTokenExpiry')).toBe(null);
    });

    it('handles network errors', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', futureTime.toString());
      
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      await expect(authenticatedFetch('/test-endpoint')).rejects.toThrow('Network error');
    });
  });

  describe('Edge Cases', () => {
    it('handles malformed expiry timestamps', () => {
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', 'invalid-timestamp');
      
      expect(isAdminAuthenticated()).toBe(false);
      expect(getAdminToken()).toBe(null);
    });

    it('handles extremely large timestamp values', () => {
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', '9999999999999'); // Far future
      
      expect(isAdminAuthenticated()).toBe(true);
      expect(getAdminToken()).toBe('valid-token');
    });

    it('handles negative timestamp values', () => {
      localStorage.setItem('adminToken', 'valid-token');
      localStorage.setItem('adminTokenExpiry', '-1');
      
      expect(isAdminAuthenticated()).toBe(false);
      expect(getAdminToken()).toBe(null);
    });
  });
});