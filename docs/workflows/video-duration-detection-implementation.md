# Video Duration Detection Implementation Workflow

## Overview
Implement accurate video duration detection to fix discrepancies between stored and actual video durations in the experiment videos system.

**Priority**: High  
**Estimated Time**: 4-6 hours  
**Risk Level**: Low (Non-breaking changes)

## Current State Analysis
- ❌ **Issue**: ForBigger series videos marked as 15 seconds, actually 60 seconds
- ❌ **Impact**: Timeline visualizations, progress bars, and analytics are incorrect
- 🔍 **Root Cause**: Manual duration entry without validation

## Implementation Phases

### Phase 1: Database Correction (30 minutes)
**Dependencies**: None  
**Parallel Execution**: Can run independently

#### Tasks:
1. **Create migration file** `009_fix_video_durations.sql`
   ```sql
   -- Fix incorrect durations for ForBigger videos
   UPDATE experiment_videos 
   SET 
     duration_seconds = 60,
     updated_at = NOW()
   WHERE video_name LIKE '%ForBigger%' 
     AND duration_seconds = 15;

   -- Add tracking columns for future validation
   ALTER TABLE experiment_videos 
   ADD COLUMN IF NOT EXISTS duration_verified BOOLEAN DEFAULT false,
   ADD COLUMN IF NOT EXISTS duration_measured_at TIMESTAMPTZ,
   ADD COLUMN IF NOT EXISTS duration_source TEXT DEFAULT 'manual';

   -- Update existing records
   UPDATE experiment_videos 
   SET duration_source = 'manual'
   WHERE duration_source IS NULL;
   ```

2. **Execute migration**
   ```bash
   npx supabase migration new fix_video_durations
   # Add SQL content
   npx supabase db push
   ```

3. **Verify in Supabase dashboard**
   - Check experiment_videos table
   - Confirm duration updates

### Phase 2: Client-Side Duration Detection (1-2 hours)
**Dependencies**: None  
**Parallel Execution**: Can start immediately

#### Tasks:
1. **Create video metadata utility** `src/utils/videoMetadata.ts`
   ```typescript
   export interface VideoMetadata {
     duration: number;
     width?: number;
     height?: number;
     verified: boolean;
   }

   export async function getVideoDuration(videoUrl: string): Promise<number> {
     return new Promise((resolve, reject) => {
       const video = document.createElement('video');
       video.preload = 'metadata';
       
       const timeout = setTimeout(() => {
         video.remove();
         reject(new Error('Video metadata load timeout'));
       }, 10000); // 10 second timeout
       
       video.onloadedmetadata = () => {
         clearTimeout(timeout);
         const duration = Math.round(video.duration);
         video.remove();
         resolve(duration);
       };
       
       video.onerror = () => {
         clearTimeout(timeout);
         video.remove();
         reject(new Error('Failed to load video metadata'));
       };
       
       // Handle CORS
       video.crossOrigin = 'anonymous';
       video.src = videoUrl;
     });
   }

   export async function verifyVideoDuration(
     videoUrl: string, 
     expectedDuration: number, 
     tolerance: number = 2
   ): Promise<boolean> {
     try {
       const actualDuration = await getVideoDuration(videoUrl);
       return Math.abs(actualDuration - expectedDuration) <= tolerance;
     } catch (error) {
       console.error('Duration verification failed:', error);
       return false;
     }
   }
   ```

2. **Add type definitions** `src/types/experiment.ts`
   ```typescript
   export interface ExperimentVideo {
     experiment_id: string;
     video_url: string;
     video_name: string;
     duration_seconds: number;
     duration_verified?: boolean;
     duration_measured_at?: string;
     duration_source?: 'manual' | 'auto-detected' | 'verified';
     is_active: boolean;
   }
   ```

### Phase 3: Admin Dashboard Integration (1-2 hours)
**Dependencies**: Phase 2 completion  
**Parallel Execution**: No - requires utility functions

#### Tasks:
1. **Update AdminDashboard component**
   ```typescript
   // src/components/AdminDashboard.tsx
   
   import { getVideoDuration, verifyVideoDuration } from '@/utils/videoMetadata';
   
   // Add after video selection
   useEffect(() => {
     const verifyAndUpdateDuration = async () => {
       if (!selectedVideo) return;
       
       try {
         const actualDuration = await getVideoDuration(selectedVideo.video_url);
         
         if (Math.abs(actualDuration - selectedVideo.duration_seconds) > 2) {
           console.warn(
             `Duration mismatch for ${selectedVideo.video_name}: 
              DB: ${selectedVideo.duration_seconds}s, 
              Actual: ${actualDuration}s`
           );
           
           // Update local state with actual duration
           setDuration(actualDuration);
           
           // Optionally update database
           if (import.meta.env.VITE_AUTO_UPDATE_DURATION === 'true') {
             await updateVideoDuration(selectedVideo.experiment_id, actualDuration);
           }
         }
       } catch (error) {
         console.error('Duration verification failed:', error);
         // Fall back to stored duration
         setDuration(selectedVideo.duration_seconds);
       }
     };
     
     verifyAndUpdateDuration();
   }, [selectedVideo]);
   ```

2. **Add duration indicator**
   ```tsx
   // Show verification status in UI
   {selectedVideo && (
     <div className="flex items-center gap-2">
       <span className="text-sm text-muted-foreground">
         Duration: {duration}s
       </span>
       {durationVerified ? (
         <CheckCircle className="w-4 h-4 text-green-500" />
       ) : (
         <AlertCircle className="w-4 h-4 text-yellow-500" />
       )}
     </div>
   )}
   ```

### Phase 4: Backend Duration Verification (1-2 hours)
**Dependencies**: Phase 1 completion  
**Parallel Execution**: Can start after Phase 1

#### Tasks:
1. **Create Edge Function** `supabase/functions/verify-video-duration/index.ts`
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

   serve(async (req) => {
     const { experiment_id, duration } = await req.json();
     
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     );
     
     const { data, error } = await supabase
       .from('experiment_videos')
       .update({
         duration_seconds: duration,
         duration_verified: true,
         duration_measured_at: new Date().toISOString(),
         duration_source: 'auto-detected'
       })
       .eq('experiment_id', experiment_id);
     
     if (error) {
       return new Response(JSON.stringify({ error: error.message }), {
         status: 400,
         headers: { "Content-Type": "application/json" },
       });
     }
     
     return new Response(JSON.stringify({ success: true, data }), {
       headers: { "Content-Type": "application/json" },
     });
   });
   ```

2. **Deploy Edge Function**
   ```bash
   supabase functions deploy verify-video-duration
   ```

### Phase 5: Testing & Validation (1 hour)
**Dependencies**: All phases complete  
**Parallel Execution**: No - final validation

#### Tasks:
1. **Create test suite** `src/utils/__tests__/videoMetadata.test.ts`
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { getVideoDuration, verifyVideoDuration } from '../videoMetadata';

   describe('Video Duration Detection', () => {
     it('should detect video duration correctly', async () => {
       const testVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
       const duration = await getVideoDuration(testVideoUrl);
       expect(duration).toBe(60); // Actual duration is 60 seconds
     });

     it('should verify duration within tolerance', async () => {
       const testVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
       const isValid = await verifyVideoDuration(testVideoUrl, 596, 2);
       expect(isValid).toBe(true);
     });
   });
   ```

2. **Manual validation checklist**
   - [ ] All ForBigger videos show 60 seconds in Admin Dashboard
   - [ ] Big Buck Bunny shows 596 seconds
   - [ ] Progress bars sync correctly with video playback
   - [ ] Timeline charts align with actual video duration
   - [ ] Duration verification indicators display correctly

### Phase 6: Documentation & Deployment (30 minutes)
**Dependencies**: Phase 5 complete  
**Parallel Execution**: No - final step

#### Tasks:
1. **Update documentation**
   - Add notes about duration detection to README
   - Document new utility functions
   - Update admin guide

2. **Deploy to production**
   ```bash
   # Run migrations on production
   supabase db push --linked
   
   # Deploy application
   npm run build
   vercel --prod
   ```

## Rollback Plan
If issues arise:
1. Revert migration: `UPDATE experiment_videos SET duration_seconds = 15 WHERE video_name LIKE '%ForBigger%'`
2. Remove duration verification code
3. Redeploy previous version

## Success Criteria
- ✅ All video durations accurately reflected in database
- ✅ Admin dashboard shows correct durations
- ✅ Timeline visualizations align with video playback
- ✅ No regression in existing functionality
- ✅ Duration verification works for new videos

## Monitoring
Post-deployment checks:
- Monitor console for duration mismatch warnings
- Check Supabase logs for update errors
- Verify admin dashboard functionality
- Test with sample videos

## Future Enhancements
- [ ] Batch duration verification for all videos
- [ ] Automatic duration detection on video upload
- [ ] Admin UI for manual duration correction
- [ ] Periodic duration validation job
- [ ] Video file size and format validation