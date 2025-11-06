/**
 * Supabase Edge Function: Video Duration Verification
 * Updates experiment video duration and verification status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface UpdateDurationRequest {
  experiment_id: string;
  duration: number;
  source?: 'auto-detected' | 'verified' | 'manual';
}

interface UpdateDurationResponse {
  success: boolean;
  data?: any;
  error?: string;
  updated_video?: {
    experiment_id: string;
    video_name: string;
    old_duration: number;
    new_duration: number;
    duration_source: string;
  };
}

serve(async (req) => {
  // Handle CORS for all origins
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Parse request body
    const body: UpdateDurationRequest = await req.json();
    const { experiment_id, duration, source = 'auto-detected' } = body;

    // Validate input
    if (!experiment_id || typeof duration !== 'number' || duration <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request. experiment_id and positive duration are required.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current video data for comparison
    const { data: currentVideo, error: fetchError } = await supabase
      .from('experiment_videos')
      .select('experiment_id, video_name, duration_seconds, duration_source')
      .eq('experiment_id', experiment_id)
      .single();

    if (fetchError || !currentVideo) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Video not found: ${fetchError?.message || 'Unknown error'}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update video duration and verification status
    const { data, error } = await supabase
      .from('experiment_videos')
      .update({
        duration_seconds: Math.round(duration), // Ensure integer
        duration_verified: true,
        duration_measured_at: new Date().toISOString(),
        duration_source: source,
        updated_at: new Date().toISOString()
      })
      .eq('experiment_id', experiment_id)
      .select('*')
      .single();

    if (error) {
      console.error('Database update error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to update video duration: ${error.message}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare response with update details
    const response: UpdateDurationResponse = {
      success: true,
      data,
      updated_video: {
        experiment_id: currentVideo.experiment_id,
        video_name: currentVideo.video_name,
        old_duration: currentVideo.duration_seconds,
        new_duration: Math.round(duration),
        duration_source: source
      }
    };

    console.log(`Duration updated: ${currentVideo.video_name} from ${currentVideo.duration_seconds}s to ${Math.round(duration)}s (source: ${source})`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Server error: ${error.message || 'Unknown error'}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/* 
Usage Example:
POST /functions/v1/verify-video-duration
Content-Type: application/json
Authorization: Bearer <anon-key>

{
  "experiment_id": "12345678-1234-1234-1234-123456789012",
  "duration": 60,
  "source": "auto-detected"
}

Response:
{
  "success": true,
  "data": { ... },
  "updated_video": {
    "experiment_id": "12345678-1234-1234-1234-123456789012",
    "video_name": "For Bigger Fun (Short)",
    "old_duration": 15,
    "new_duration": 60,
    "duration_source": "auto-detected"
  }
}
*/