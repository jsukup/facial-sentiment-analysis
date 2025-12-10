import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

// API base URL for admin endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Development mode bypass for testing
    if (import.meta.env.DEV && username === "admin" && password === "admin") {
      // Store a mock token for development
      localStorage.setItem('adminToken', 'dev-mock-token');
      localStorage.setItem('adminTokenExpiry', String(Date.now() + (24 * 60 * 60 * 1000))); // 24 hours
      onLoginSuccess();
      return;
    }

    try {
      // Authenticate with JWT-based admin login
      const response = await fetch(`${API_BASE_URL}/server/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setPassword(''); // Clear password field after failed login
        setLoading(false);
        return;
      }

      if (!data.success || !data.token) {
        setError('Authentication failed - no token received');
        setPassword(''); // Clear password field after failed login
        setLoading(false);
        return;
      }

      // Store the JWT token for authenticated requests
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminTokenExpiry', String(Date.now() + (24 * 60 * 60 * 1000))); // 24 hours

      // Success - call the callback
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error occurred");
      setPassword(''); // Clear password field after network error
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
