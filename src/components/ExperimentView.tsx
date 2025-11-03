import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Play, Square, Eye, EyeOff, Video } from "lucide-react";
import * as faceapi from "@vladmandic/face-api";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { loadFaceApiModels, checkTensorFlowBackend } from "../utils/faceapi-loader";
import { logError, logUserAction, logPerformance } from "../utils/logger";
import { 
  calculateWebcamDuration, 
  validateDuration, 
  logDurationCalculation,
  formatDuration 
} from "../utils/durationCalculator";
import type { WebcamRecordingDuration } from "../types/duration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";

interface ExperimentViewProps {
  webcamStream: MediaStream;
  userId: string;
  onComplete: (sentimentData: SentimentDataPoint[], captureId?: string) => void;
}

export interface SentimentDataPoint {
  timestamp: number;
  expressions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
}

interface ExperimentVideo {
  experiment_id: string;
  video_url: string;
  video_name: string;
  duration_seconds: number;
  is_active: boolean;
}

export function ExperimentView({ webcamStream, userId, onComplete }: ExperimentViewProps) {
  // Log webcam stream status for debugging
  console.log("🎥 ExperimentView initialized with webcamStream:", {
    exists: !!webcamStream,
    active: webcamStream?.active,
    videoTracks: webcamStream?.getVideoTracks().length || 0
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [sentimentData, setSentimentData] = useState<SentimentDataPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [webcamReady, setWebcamReady] = useState(false);
  const [showWebcamPreview, setShowWebcamPreview] = useState(true);
  const [mediaRecorderWorking, setMediaRecorderWorking] = useState(false);
  
  // Video selection state
  const [availableVideos, setAvailableVideos] = useState<ExperimentVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ExperimentVideo | null>(null);
  const [videosLoading, setVideosLoading] = useState(true);
  
  // Enhanced webcam recording duration tracking
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingStopTime, setRecordingStopTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [durationTrackingRef, setDurationTrackingRef] = useState<WebcamRecordingDuration>({
    duration: 0,
    startTime: null,
    stopTime: null,
    isFromRecording: false,
    source: 'fallback'
  });

  // Load face-api models using singleton pattern
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Check backend status first
        const backendStatus = await checkTensorFlowBackend();
        console.log("TensorFlow backend status:", backendStatus);
        
        await loadFaceApiModels();
        setModelsLoaded(true);
        logUserAction('face_api_models_loaded', userId);
        
        // Log successful initialization
        const finalBackendStatus = await checkTensorFlowBackend();
        console.log("Final TensorFlow backend status:", finalBackendStatus);
      } catch (error) {
        logError("Error loading face-api models", error as Error, "ExperimentView", userId);
        
        // Log additional debug information
        try {
          const backendStatus = await checkTensorFlowBackend();
          console.error("Backend status during error:", backendStatus);
        } catch (backendError) {
          console.error("Could not check backend status:", backendError);
        }
      }
    };

    loadModels();
  }, [userId]);

  // Fetch available experiment videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setVideosLoading(true);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/rest/v1/experiment_videos?select=experiment_id,video_url,video_name,duration_seconds,is_active&is_active=eq.true&order=duration_seconds.asc`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'apikey': publicAnonKey
            }
          }
        );

        if (response.ok) {
          const videos: ExperimentVideo[] = await response.json();
          setAvailableVideos(videos);
          
          // Set default video (first one, which should be shortest due to ordering)
          if (videos.length > 0) {
            setSelectedVideo(videos[0]);
            logUserAction('experiment_videos_loaded', userId, { 
              videoCount: videos.length,
              defaultVideo: videos[0].video_name 
            });
          }
        } else {
          logError('Failed to fetch experiment videos', new Error(`HTTP ${response.status}`), 'ExperimentView', userId);
          
          // Fallback to BigBuckBunny if API fails
          const fallbackVideo: ExperimentVideo = {
            experiment_id: 'fallback',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            video_name: 'Big Buck Bunny (Fallback)',
            duration_seconds: 596,
            is_active: true
          };
          setAvailableVideos([fallbackVideo]);
          setSelectedVideo(fallbackVideo);
        }
      } catch (error) {
        logError('Error fetching experiment videos', error as Error, 'ExperimentView', userId);
        
        // Fallback to BigBuckBunny if fetch fails
        const fallbackVideo: ExperimentVideo = {
          experiment_id: 'fallback',
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          video_name: 'Big Buck Bunny (Fallback)',
          duration_seconds: 596,
          is_active: true
        };
        setAvailableVideos([fallbackVideo]);
        setSelectedVideo(fallbackVideo);
      } finally {
        setVideosLoading(false);
      }
    };

    fetchVideos();
  }, [userId]);

  // Safety net: if webcam stream exists but webcamReady is still false after 5 seconds, force it
  useEffect(() => {
    if (webcamStream && !webcamReady) {
      const safetyTimeout = setTimeout(() => {
        logUserAction('webcam_safety_net_triggered', userId, { 
          streamActive: webcamStream.active,
          videoTracks: webcamStream.getVideoTracks().length 
        });
        setWebcamReady(true);
      }, 5000);
      
      return () => clearTimeout(safetyTimeout);
    }
  }, [webcamStream, webcamReady, userId]);

  // Monitor webcam stream state changes
  useEffect(() => {
    if (webcamStream) {
      const videoTrack = webcamStream.getVideoTracks()[0];
      if (videoTrack) {
        const handleTrackEnded = () => {
          logUserAction('webcam_track_ended', userId, { 
            trackState: videoTrack.readyState,
            streamActive: webcamStream.active 
          });
        };
        
        const handleTrackMute = () => {
          logUserAction('webcam_track_muted', userId, { 
            trackEnabled: videoTrack.enabled,
            streamActive: webcamStream.active 
          });
        };
        
        videoTrack.addEventListener('ended', handleTrackEnded);
        videoTrack.addEventListener('mute', handleTrackMute);
        
        return () => {
          videoTrack.removeEventListener('ended', handleTrackEnded);
          videoTrack.removeEventListener('mute', handleTrackMute);
        };
      }
    }
  }, [webcamStream, userId]);

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      // Cleanup MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      
      // Clear chunks array to prevent memory leaks
      chunksRef.current = [];
      
      // Clear sentiment data
      setSentimentData([]);
    };
  }, []);

  // Setup webcam video element and ensure it keeps playing
  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      const videoElement = webcamVideoRef.current;
      
      // Check stream health before proceeding
      const streamActive = webcamStream.active;
      const videoTracks = webcamStream.getVideoTracks();
      const hasActiveTrack = videoTracks.some(track => track.readyState === 'live');
      
      console.log("🔍 Stream health check:", {
        streamActive,
        tracksCount: videoTracks.length,
        hasActiveTrack,
        currentSrcObject: !!videoElement.srcObject,
        srcObjectMatches: videoElement.srcObject === webcamStream
      });
      
      // Re-attach stream if needed or if stream health is poor
      const needsReattach = (
        videoElement.srcObject !== webcamStream || 
        !streamActive || 
        !hasActiveTrack ||
        videoTracks.length === 0
      );
      
      if (needsReattach) {
        console.log("📹 Re-attaching webcam stream to video element");
        videoElement.srcObject = webcamStream;
        
        // Try to play immediately and handle different states
        const startWebcam = async () => {
          try {
            await videoElement.play();
            setWebcamReady(true);
            logUserAction('webcam_video_started', userId, { 
              readyState: videoElement.readyState,
              streamActive: webcamStream.active,
              tracksCount: videoTracks.length
            });
          } catch (error) {
            // Only log non-AbortError cases to reduce noise
            if (error.name !== 'AbortError') {
              logError("Error starting webcam video", error as Error, "ExperimentView", userId);
            }
            // Set ready anyway - the video stream might still be working for face detection
            setWebcamReady(true);
          }
        };
        
        // If video is already loaded, start immediately
        if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
          startWebcam();
        } else {
          // Wait for enough data to be loaded
          const handleCanPlay = () => {
            startWebcam();
            videoElement.removeEventListener('canplay', handleCanPlay);
          };
          videoElement.addEventListener('canplay', handleCanPlay);
          
          // Fallback timeout to prevent hanging
          const timeout = setTimeout(() => {
            videoElement.removeEventListener('canplay', handleCanPlay);
            logUserAction('webcam_fallback_timeout', userId, { 
              readyState: videoElement.readyState,
              streamActive: webcamStream.active 
            });
            setWebcamReady(true); // Set ready anyway
          }, 3000); // 3 second timeout
          
          return () => {
            clearTimeout(timeout);
            videoElement.removeEventListener('canplay', handleCanPlay);
          };
        }
      } else {
        // If srcObject is already set and healthy, just mark as ready
        console.log("✅ Webcam stream already attached and healthy");
        setWebcamReady(true);
      }
    }
  }, [webcamStream, userId]);

  // Start facial detection
  useEffect(() => {
    if (!modelsLoaded || !webcamReady || !isPlaying || !webcamVideoRef.current || !canvasRef.current) {
      return;
    }

    console.log("✅ Starting face detection interval");
    const detectInterval = setInterval(async () => {
      if (webcamVideoRef.current && videoRef.current) {
        try {
          const detections = await faceapi
            .detectSingleFace(webcamVideoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          if (detections) {
            const currentTime = videoRef.current.currentTime;
            const expressions = detections.expressions;
            
            console.log("😊 Face detected - expressions:", {
              timestamp: currentTime,
              neutral: expressions.neutral.toFixed(3),
              happy: expressions.happy.toFixed(3),
              sad: expressions.sad.toFixed(3),
              angry: expressions.angry.toFixed(3),
              fearful: expressions.fearful.toFixed(3),
              disgusted: expressions.disgusted.toFixed(3),
              surprised: expressions.surprised.toFixed(3)
            });
            
            setSentimentData(prev => {
              // Debounce: only add if sufficient time has passed since last data point
              const lastTimestamp = prev.length > 0 ? prev[prev.length - 1].timestamp : -1;
              if (currentTime - lastTimestamp < 0.4) { // Skip if less than 400ms since last capture
                console.log("⏭️ Skipping face data - too soon since last capture");
                return prev;
              }
              
              const newDataPoint = {
                timestamp: currentTime,
                expressions: {
                  neutral: Math.round(expressions.neutral * 1000) / 1000, // Round to reduce memory
                  happy: Math.round(expressions.happy * 1000) / 1000,
                  sad: Math.round(expressions.sad * 1000) / 1000,
                  angry: Math.round(expressions.angry * 1000) / 1000,
                  fearful: Math.round(expressions.fearful * 1000) / 1000,
                  disgusted: Math.round(expressions.disgusted * 1000) / 1000,
                  surprised: Math.round(expressions.surprised * 1000) / 1000,
                }
              };
              
              console.log("✅ Adding sentiment data point:", newDataPoint);
              
              // Prevent memory leaks by limiting data points (keep last 1000 points)
              const updatedData = [...prev, newDataPoint];
              if (updatedData.length > 1000) {
                return updatedData.slice(-1000);
              }
              return updatedData;
            });
          } else {
            console.log("👤 No face detected in frame");
          }
        } catch (error) {
          logError("Face detection error", error as Error, "ExperimentView", userId);
        }
      }
    }, 500); // Check every 500ms

    return () => clearInterval(detectInterval);
  }, [modelsLoaded, webcamReady, isPlaying, userId]);

  // Track recording duration in real-time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (recordingStartTime !== null && isPlaying) {
      interval = setInterval(() => {
        const currentDuration = (Date.now() - recordingStartTime) / 1000; // Convert to seconds
        setRecordingDuration(currentDuration);
      }, 100); // Update every 100ms for smooth tracking
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recordingStartTime, isPlaying]);

  const handlePlay = () => {
    if (videoRef.current && webcamStream) {
      videoRef.current.play();
      setIsPlaying(true);

      // Start recording webcam with fallback codec support
      try {
        // Create a new blob chunks array for recording
        chunksRef.current = [];
        
        let mediaRecorderWorking = false;
        
        // Test different codecs in priority order
        const codecs = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus', 
          'video/webm;codecs=h264,opus',
          'video/webm',
          'video/mp4'
        ];
        
        let selectedCodec = null;
        for (const codec of codecs) {
          if (MediaRecorder.isTypeSupported(codec)) {
            selectedCodec = codec;
            break;
          }
        }

        if (!selectedCodec || !MediaRecorder.isTypeSupported(selectedCodec)) {
          throw new Error(`No supported codec found. Tested: ${codecs.join(', ')}`);
        }

        const mediaRecorder = new MediaRecorder(webcamStream, {
          mimeType: selectedCodec,
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        // Initial onstop placeholder - this will be replaced dynamically in handleStop()
        mediaRecorder.onstop = () => {
          console.log("📹 MediaRecorder stopped - callback will be replaced dynamically");
        };

          mediaRecorder.start();
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorderWorking = true;
          setMediaRecorderWorking(true);
          
          // Start recording duration tracking
          const recordingStart = Date.now();
          setRecordingStartTime(recordingStart);
          setRecordingDuration(0);
          
          // Log successful recording start with codec info and stream status
          const videoTracks = webcamStream.getVideoTracks();
          const videoTrack = videoTracks[0];
          const videoTrackState = videoTrack ? videoTrack.readyState : 'no-track';
          const videoTrackEnabled = videoTrack ? videoTrack.enabled : false;
          
          logUserAction('webcam_recording_started', userId, { 
            codec: selectedCodec,
            recordingSupported: true,
            videoTrackState,
            videoTrackEnabled,
            streamActive: webcamStream.active,
            videoTracksCount: videoTracks.length
          });
        
      } catch (error) {
        logError('Error starting media recorder', error as Error, "ExperimentView", userId);
        
        // MediaRecorder failed, but still track duration for face detection session
        const recordingStart = Date.now();
        setRecordingStartTime(recordingStart);
        setRecordingDuration(0);
        
        logUserAction('webcam_recording_failed_continuing', userId, { 
          errorMessage: (error as Error).message,
          willContinueWithFaceDetection: true,
          startedDurationTracking: true
        });
      }
      
      // Log the final status of MediaRecorder
      logUserAction('experiment_started', userId, { 
        mediaRecorderWorking,
        faceDetectionEnabled: modelsLoaded && webcamReady,
        videoStarted: true
      });
    }
  };

  // handlePause removed - experiment videos should not allow pausing

  const handleVideoEnded = () => {
    setIsPlaying(false);
    
    // Calculate duration using improved utility function
    const stopTime = Date.now();
    setRecordingStopTime(stopTime);
    
    const durationResult = calculateWebcamDuration(
      recordingStartTime,
      stopTime,
      videoRef.current?.currentTime
    );
    
    logDurationCalculation(durationResult, 'handleVideoEnded', {
      recordingStartTime,
      stopTime,
      videoElementTime: videoRef.current?.currentTime,
      userId
    });
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Pass the validated duration
      mediaRecorderRef.current.onstop = async () => {
        try {
          await handleMediaRecorderStop({ 
            sentimentData: [...sentimentData], 
            videoTime: durationResult.duration 
          });
        } catch (error) {
          logError("Error in MediaRecorder onstop handler", error as Error, "ExperimentView", userId);
          onComplete(sentimentData);
        }
      };
      mediaRecorderRef.current.stop();
    } else {
      // No MediaRecorder, handle completion directly with calculated duration
      handleCompletionWithoutVideo([...sentimentData], durationResult.duration);
    }
    
    // Reset recording tracking
    setRecordingStartTime(null);
    setRecordingStopTime(null);
    setRecordingDuration(0);
  };

  const handleStop = () => {
    // CRITICAL FIX: Capture sentiment data immediately before any async operations
    // This prevents race condition with component cleanup effect
    const capturedSentimentData = [...sentimentData];
    
    // Calculate duration using improved utility function
    const stopTime = Date.now();
    setRecordingStopTime(stopTime);
    
    const durationResult = calculateWebcamDuration(
      recordingStartTime,
      stopTime,
      videoRef.current?.currentTime
    );
    
    logDurationCalculation(durationResult, 'handleStop', {
      dataPointCount: capturedSentimentData.length,
      firstPoint: capturedSentimentData[0]?.timestamp,
      lastPoint: capturedSentimentData[capturedSentimentData.length - 1]?.timestamp,
      recordingStartTime,
      stopTime,
      userId
    });
    
    // Stop the video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    // Store captured data in a ref that won't be cleared by cleanup effects
    const capturedDataRef = { sentimentData: capturedSentimentData, videoTime: durationResult.duration };
    
    // Stop MediaRecorder and trigger data processing
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Modify the onstop callback to use our captured data
      mediaRecorderRef.current.onstop = async () => {
        try {
          // Use captured data instead of current state
          await handleMediaRecorderStop(capturedDataRef);
        } catch (error) {
          logError("Error in MediaRecorder onstop handler", error as Error, "ExperimentView", userId);
          // Still complete with captured data even if upload fails
          onComplete(capturedDataRef.sentimentData);
        }
      };
      mediaRecorderRef.current.stop();
    } else {
      // If MediaRecorder isn't running, trigger completion directly with captured data
      handleCompletionWithoutVideo(capturedDataRef.sentimentData, capturedDataRef.videoTime);
    }
    
    // Reset recording tracking
    setRecordingStartTime(null);
    setRecordingStopTime(null);
    setRecordingDuration(0);
    
    logUserAction('experiment_stopped_manually', userId, { 
      webcamRecordingDuration: durationResult.duration,
      durationSource: durationResult.source,
      durationValid: durationResult.isValid,
      sentimentDataPoints: capturedSentimentData.length 
    });
  };

  const handleCompletionWithoutVideo = async (capturedSentimentData?: SentimentDataPoint[], capturedVideoTime?: number) => {
    try {
      setIsProcessing(true);
      
      // Use provided captured data or fall back to current state (for backward compatibility)
      const finalSentimentData = capturedSentimentData || [...sentimentData];
      
      // Validate the provided duration or calculate a fallback
      let finalVideoTime = capturedVideoTime;
      if (!finalVideoTime || finalVideoTime <= 0) {
        const fallbackDuration = calculateWebcamDuration(
          recordingStartTime,
          Date.now(),
          videoRef.current?.currentTime
        );
        finalVideoTime = fallbackDuration.duration;
        
        logDurationCalculation(fallbackDuration, 'handleCompletionWithoutVideo-fallback', {
          providedDuration: capturedVideoTime,
          userId
        });
      }
      
      console.log("🔒 Captured sentiment data for submission (no video):", {
        dataPointCount: finalSentimentData.length,
        firstPoint: finalSentimentData[0]?.timestamp,
        lastPoint: finalSentimentData[finalSentimentData.length - 1]?.timestamp,
        videoTime: finalVideoTime
      });
      
      // Submit sentiment data without video capture
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/sentiment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId,
            captureId: null, // No video capture
            sentimentData: finalSentimentData,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logError("Failed to store sentiment data", new Error(errorText), "ExperimentView", userId);
      } else {
        logUserAction("sentiment_data_submitted_without_video", userId, { dataPointCount: finalSentimentData.length });
      }

      onComplete(finalSentimentData);
    } catch (error) {
      logError("Error submitting sentiment data without video", error as Error, "ExperimentView", userId);
      onComplete(capturedSentimentData || sentimentData || []); // Still complete even if submission fails
    }
  };

  // New function to handle MediaRecorder stop with captured data
  const handleMediaRecorderStop = async (capturedDataRef: { sentimentData: SentimentDataPoint[], videoTime: number }) => {
    // Validate the duration before uploading
    const validationResult = validateDuration(capturedDataRef.videoTime);
    const finalDuration = validationResult.duration;
    
    logDurationCalculation({
      duration: finalDuration,
      isValid: validationResult.isValid,
      source: 'recording',
      validationError: validationResult.error
    }, 'handleMediaRecorderStop', {
      dataPointCount: capturedDataRef.sentimentData.length,
      originalDuration: capturedDataRef.videoTime,
      userId
    });
    
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    
    // Upload to backend with validated video duration
    const formData = new FormData();
    formData.append('video', blob, `webcam_${userId}.webm`);
    formData.append('userId', userId);
    formData.append('duration', finalDuration.toString()); // Add validated video duration
    
    // Use the selected video's experiment ID directly
    const experimentId = selectedVideo?.experiment_id || null;
    
    logUserAction('experiment_id_from_selection', userId, { 
      experimentId,
      videoName: selectedVideo?.video_name,
      videoUrl: selectedVideo?.video_url,
      hasSelectedVideo: !!selectedVideo
    });
    
    // Only append experimentId if we have one, otherwise backend will handle null
    if (experimentId) {
      formData.append('experimentId', experimentId);
    }

    let captureId: string | undefined;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/upload-webcam`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        captureId = result.captureId;
        logUserAction('webcam_video_uploaded', userId, { captureId, duration: capturedDataRef.videoTime });
      } else {
        logError('Failed to upload webcam video', new Error(`HTTP ${response.status}`), "ExperimentView", userId);
      }
    } catch (error) {
      logError('Error uploading webcam video', error as Error, "ExperimentView", userId);
    }

    // Clean up MediaRecorder reference
    mediaRecorderRef.current = null;
    
    // Use captured data for completion
    onComplete(capturedDataRef.sentimentData, captureId);
  };

  // Keep the old function for backward compatibility
  const handleEarlyCompletion = handleCompletionWithoutVideo;

  return (
    <>
      {/* Webcam preview - positioned absolutely outside main container */}
      <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
        <div className="pointer-events-auto">
        {showWebcamPreview ? (
          <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-white/20">
            <video
              ref={webcamVideoRef}
              autoPlay
              playsInline
              muted
              className="w-48 h-36 object-cover"
            />
            {/* Face detection indicator */}
            <div className="absolute top-2 left-2">
              <div className={`w-3 h-3 rounded-full ${
                sentimentData.length > 0 ? 'bg-green-400' : 'bg-red-400'
              } animate-pulse`}></div>
            </div>
            {/* Webcam status indicator */}
            <div className="absolute top-2 right-2">
              <div className={`w-3 h-3 rounded-full ${
                webcamReady && webcamStream?.active && webcamStream?.getVideoTracks().some(t => t.readyState === 'live') 
                  ? 'bg-blue-400' 
                  : webcamStream?.active 
                    ? 'bg-yellow-400' 
                    : 'bg-red-400'
              }`} title={
                webcamReady && webcamStream?.active && webcamStream?.getVideoTracks().some(t => t.readyState === 'live')
                  ? 'Webcam healthy'
                  : webcamStream?.active 
                    ? 'Webcam starting...'
                    : 'Webcam inactive'
              }></div>
            </div>
            {/* Toggle button */}
            <button
              onClick={() => setShowWebcamPreview(false)}
              className="absolute bottom-1 right-1 text-white bg-black/50 hover:bg-black/70 p-1 rounded"
            >
              <EyeOff className="w-3 h-3" />
            </button>
            {/* Label */}
            <div className="absolute bottom-1 left-1 text-white text-xs bg-black/50 px-1 rounded">
              You
            </div>
          </div>
        ) : (
          /* Hidden video for face detection */
          <>
            <video
              ref={webcamVideoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
            />
            {/* Toggle button to show webcam */}
            <button
              onClick={() => setShowWebcamPreview(true)}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded"
              title="Show webcam preview"
            >
              <Eye className="w-4 h-4" />
            </button>
          </>
        )}
        </div>
      </div>

      {/* Main content container */}
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-5xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h2>Experiment Video</h2>
            <p className="text-muted-foreground">
              {isProcessing ? "Processing your responses..." : 
               !isPlaying ? "Click Play below to start the experiment and face detection" :
               "Watch the video below and react naturally"}
            </p>
            {!isPlaying && modelsLoaded && webcamReady && (
              <div className="bg-green-100 border border-green-300 text-green-800 px-3 py-2 rounded-md text-sm">
                ✅ Ready! Click Play to start face detection and video
              </div>
            )}
            {isPlaying && !mediaRecorderWorking && (
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-md text-sm">
                ⚠️ Face detection active, video recording unavailable
              </div>
            )}
            {isPlaying && sentimentData.length > 0 && (
              <div className="bg-blue-100 border border-blue-300 text-blue-800 px-3 py-2 rounded-md text-sm">
                😊 Detecting faces: {sentimentData.length} data points collected
              </div>
            )}
          </div>

          {/* Video Selection Dropdown */}
          {!isPlaying && !isProcessing && (
            <div className="max-w-md mx-auto space-y-2">
              <Label htmlFor="video-select" className="text-sm font-medium flex items-center gap-2">
                <Video className="w-4 h-4" />
                Choose Experiment Video
              </Label>
              <Select
                value={selectedVideo?.experiment_id || ''}
                onValueChange={(value) => {
                  const video = availableVideos.find(v => v.experiment_id === value);
                  if (video) {
                    setSelectedVideo(video);
                    logUserAction('experiment_video_changed', userId, { 
                      videoName: video.video_name,
                      duration: video.duration_seconds 
                    });
                  }
                }}
                disabled={videosLoading || isPlaying}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={videosLoading ? "Loading videos..." : "Select a video"} />
                </SelectTrigger>
                <SelectContent>
                  {availableVideos.map((video) => (
                    <SelectItem key={video.experiment_id} value={video.experiment_id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{video.video_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {video.duration_seconds < 60 
                            ? `${video.duration_seconds}s` 
                            : `${Math.round(video.duration_seconds / 60)}m`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVideo && (
                <p className="text-xs text-muted-foreground text-center">
                  Duration: {selectedVideo.duration_seconds < 60 
                    ? `${selectedVideo.duration_seconds} seconds` 
                    : `${Math.floor(selectedVideo.duration_seconds / 60)} minutes ${selectedVideo.duration_seconds % 60} seconds`}
                </p>
              )}
            </div>
          )}

          <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onEnded={handleVideoEnded}
              controls={false}
              key={selectedVideo?.experiment_id} // Force reload when video changes
            >
              {selectedVideo && (
                <source src={selectedVideo.video_url} type="video/mp4" />
              )}
            </video>
            
            {/* Loading overlay when no video selected */}
            {!selectedVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                <div className="text-white text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Loading videos...</p>
                </div>
              </div>
            )}
          </div>

          {!isPlaying && !isProcessing && (
            <div className="flex flex-col items-center space-y-3">
              <Button
                onClick={handlePlay}
                size="lg"
                className="min-w-[200px] bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 text-lg"
                disabled={!modelsLoaded || !webcamReady || !selectedVideo || videosLoading}
              >
                <Play className="w-6 h-6 mr-3" />
                {videosLoading ? "Loading videos..." :
                 !selectedVideo ? "Select a video..." :
                 !modelsLoaded ? "Loading AI models..." : 
                 !webcamReady ? "Starting webcam..." : 
                 "Start Experiment"}
              </Button>
              {modelsLoaded && webcamReady && selectedVideo && !videosLoading && (
                <p className="text-sm text-muted-foreground animate-pulse">
                  👆 Click to begin face detection and video playback
                </p>
              )}
            </div>
          )}

          {/* Stop button for manual experiment termination */}
          {isPlaying && !isProcessing && (
            <div className="flex justify-center">
              <Button
                onClick={handleStop}
                size="lg"
                variant="destructive"
                className="min-w-[200px]"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Experiment
              </Button>
            </div>
          )}
        </div>
        
        {/* Hidden canvas for face-api */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Development debug info */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm">
            <div className="font-bold mb-2 text-yellow-400">🔧 Debug Panel</div>
            <div className="grid grid-cols-2 gap-2">
              <div>Models: {modelsLoaded ? '✅' : '❌'}</div>
              <div>Webcam: {webcamReady ? '✅' : '❌'}</div>
              <div>Stream: {webcamStream ? '✅' : '❌'}</div>
              <div>Playing: {isPlaying ? '✅' : '❌'}</div>
              <div>Processing: {isProcessing ? '✅' : '❌'}</div>
              <div>Sentiment: {sentimentData.length} pts</div>
            </div>
            {webcamStream && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div>Stream Active: {webcamStream.active ? '✅' : '❌'}</div>
                <div>Video Tracks: {webcamStream.getVideoTracks().length}</div>
                {webcamStream.getVideoTracks().map((track, i) => (
                  <div key={i} className="text-xs">
                    Track {i}: {track.enabled ? '✅' : '❌'} ({track.readyState})
                  </div>
                ))}
                <div>Recorder: {mediaRecorderRef.current ? mediaRecorderRef.current.state : 'none'}</div>
                <div>Last Detection: {sentimentData.length > 0 ? 
                  `${(Date.now() - (sentimentData[sentimentData.length - 1]?.timestamp * 1000 || 0))}ms ago` : 
                  'none'}</div>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
              Video Time: {videoRef.current?.currentTime?.toFixed(1) || 0}s
            </div>
          </div>
        )}
      </div>
    </>
  );
}