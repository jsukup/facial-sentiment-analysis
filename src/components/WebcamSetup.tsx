import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Camera, AlertCircle } from "lucide-react";
import { logError } from "../utils/logger";

interface WebcamSetupProps {
  onReady: (stream: MediaStream) => void;
}

export function WebcamSetup({ onReady }: WebcamSetupProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const initWebcam = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video metadata to load and then play
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log("✅ Video playback started successfully");
                streamRef.current = mediaStream;
                setStream(mediaStream);
                setIsLoading(false);
              })
              .catch((playError) => {
                console.error("❌ Video playback error:", playError);
                setError(`Video playback failed: ${playError.message}`);
                setIsLoading(false);
              });
          }
        };
      } else {
        // Fallback if videoRef is not available
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const error = err as Error;
      logError("Webcam access error", error, "WebcamSetup");
      setIsLoading(false);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please allow camera access in your browser settings and refresh the page.");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError("No camera found. Please ensure a camera is connected to your device.");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setError("Camera is already in use by another application. Please close other apps using the camera.");
      } else {
        setError(`Unable to access camera: ${error.message || 'Unknown error'}`);
      }
    }
  };

  useEffect(() => {
    initWebcam();

    // Don't cleanup the stream when component unmounts - it will be used in ExperimentView
    // The stream will be cleaned up by the App component when experiment completes
  }, []);

  const handleReady = () => {
    if (stream) {
      console.log("📤 WebcamSetup: Passing stream to App");
      onReady(stream);
    } else {
      console.error("❌ WebcamSetup: No stream available to pass");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Camera className="w-8 h-8 text-blue-600" />
          </div>
          <h2>Position Yourself</h2>
          <p className="text-muted-foreground">
            Please ensure your face is clearly visible within the frame
          </p>
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black p-8">
              <div className="text-center space-y-4 max-w-md">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
                <p className="text-white">{error}</p>
                <Button onClick={initWebcam} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center space-y-4">
                <Camera className="w-16 h-16 text-white/50 mx-auto animate-pulse" />
                <p className="text-white/70">Requesting camera access...</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ backgroundColor: 'transparent' }}
                onCanPlay={() => console.log("📹 Video can start playing")}
                onPlay={() => console.log("▶️ Video is playing")}
                onError={(e: React.SyntheticEvent<HTMLVideoElement, Event>) => console.error("❌ Video error:", e)}
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white/30 rounded-lg" />
                <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleReady}
            disabled={!stream || !!error || isLoading}
            size="lg"
            className="min-w-[200px]"
          >
            Ready
          </Button>
        </div>
      </div>
    </div>
  );
}
