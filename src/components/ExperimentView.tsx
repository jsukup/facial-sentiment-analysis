import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Play, Pause } from "lucide-react";
import * as faceapi from "face-api.js";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { loadFaceApiModels } from "../utils/faceapi-loader";
import { logError, logUserAction, logPerformance } from "../utils/logger";

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

export function ExperimentView({ webcamStream, userId, onComplete }: ExperimentViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [sentimentData, setSentimentData] = useState<SentimentDataPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load face-api models using singleton pattern
  useEffect(() => {
    const loadModels = async () => {
      try {
        await loadFaceApiModels();
        setModelsLoaded(true);
      } catch (error) {
        logError("Error loading face-api models", error as Error, "ExperimentView", userId);
      }
    };

    loadModels();
  }, []);

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

  // Setup webcam video element
  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      webcamVideoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  // Start facial detection
  useEffect(() => {
    if (!modelsLoaded || !isPlaying || !webcamVideoRef.current || !canvasRef.current) return;

    const detectInterval = setInterval(async () => {
      if (webcamVideoRef.current && videoRef.current) {
        try {
          const detections = await faceapi
            .detectSingleFace(webcamVideoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          if (detections) {
            const currentTime = videoRef.current.currentTime;
            const expressions = detections.expressions;
            
            setSentimentData(prev => {
              // Debounce: only add if sufficient time has passed since last data point
              const lastTimestamp = prev.length > 0 ? prev[prev.length - 1].timestamp : -1;
              if (currentTime - lastTimestamp < 0.4) { // Skip if less than 400ms since last capture
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
              
              // Prevent memory leaks by limiting data points (keep last 1000 points)
              const updatedData = [...prev, newDataPoint];
              if (updatedData.length > 1000) {
                return updatedData.slice(-1000);
              }
              return updatedData;
            });
          }
        } catch (error) {
          logError("Face detection error", error as Error, "ExperimentView", userId);
        }
      }
    }, 500); // Check every 500ms

    return () => clearInterval(detectInterval);
  }, [modelsLoaded, isPlaying]);

  const handlePlay = () => {
    if (videoRef.current && webcamStream) {
      videoRef.current.play();
      setIsPlaying(true);

      // Start recording webcam
      try {
        const mediaRecorder = new MediaRecorder(webcamStream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          setIsProcessing(true);
          
          // Create blob from chunks and immediately clear them to prevent memory leaks
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          chunksRef.current = []; // Clear chunks after creating blob
          
          // Upload to backend
          const formData = new FormData();
          formData.append('video', blob, `webcam_${userId}.webm`);
          formData.append('userId', userId);
          // Get the first experiment from database (Big Buck Bunny)
          // In a production app, you'd pass this as a prop
          formData.append('experimentId', ''); // Will use default experiment

          let captureId: string | undefined;
          try {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-8f45bf92/upload-webcam`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${publicAnonKey}`,
                },
                body: formData,
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              logError('Failed to upload webcam video', new Error(errorText), "ExperimentView", userId);
            } else {
              const result = await response.json();
              captureId = result.captureId; // Get the capture ID from the response
              logUserAction('webcam_video_uploaded', userId, { captureId });
            }
          } catch (error) {
            logError('Error uploading webcam video', error as Error, "ExperimentView", userId);
          }

          // Clean up MediaRecorder reference
          mediaRecorderRef.current = null;
          
          onComplete(sentimentData, captureId);
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      } catch (error) {
        logError('Error starting media recorder', error as Error, "ExperimentView", userId);
      }
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    // Stop MediaRecorder when pausing to prevent memory leaks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h2>Experiment Video</h2>
          <p className="text-muted-foreground">
            {isProcessing ? "Processing your responses..." : "Watch the video below and react naturally"}
          </p>
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onEnded={handleVideoEnded}
            controls={false}
          >
            <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
          </video>
        </div>

        {!isPlaying && !isProcessing && (
          <div className="flex justify-center">
            <Button
              onClick={handlePlay}
              size="lg"
              className="min-w-[200px]"
              disabled={!modelsLoaded}
            >
              <Play className="w-5 h-5 mr-2" />
              {modelsLoaded ? "Play" : "Loading..."}
            </Button>
          </div>
        )}

        {isPlaying && (
          <div className="flex justify-center">
            <Button
              onClick={handlePause}
              size="lg"
              variant="outline"
              className="min-w-[200px]"
            >
              <Pause className="w-5 h-5 mr-2" />
              Pause
            </Button>
          </div>
        )}

        {/* Hidden webcam video for face detection */}
        <video
          ref={webcamVideoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        
        {/* Hidden canvas for face-api */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
