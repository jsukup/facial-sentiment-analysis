// Authentication utilities for admin JWT token management

interface AuthTokenData {
  token: string;
  expiry: number;
}

// Get the stored admin token
export const getAdminToken = (): string | null => {
  const token = localStorage.getItem('adminToken');
  const expiry = localStorage.getItem('adminTokenExpiry');
  
  if (!token || !expiry) {
    return null;
  }
  
  // Check if token is expired
  const expiryTime = parseInt(expiry);
  if (isNaN(expiryTime) || Date.now() > expiryTime) {
    clearAdminToken();
    return null;
  }
  
  return token;
};

// Clear admin token from storage
export const clearAdminToken = (): void => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminTokenExpiry');
};

// Check if user is authenticated
export const isAdminAuthenticated = (): boolean => {
  return getAdminToken() !== null;
};

// Make authenticated API request
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAdminToken();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`, // Supabase anon key for function access
    'X-Admin-Token': token, // JWT token for admin authentication
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // If unauthorized, clear token and throw error
  if (response.status === 401) {
    clearAdminToken();
    throw new Error('Authentication failed - please login again');
  }
  
  return response;
};

// Get API base URL
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1';
};