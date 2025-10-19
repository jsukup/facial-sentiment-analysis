/* SECURITY HARDENED - Uses environment variables */

// Load configuration from environment variables
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Runtime validation to ensure configuration is loaded
if (!projectId || !publicAnonKey) {
  throw new Error(
    'Missing required Supabase configuration. Please ensure VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY are set in your environment variables.'
  )
}