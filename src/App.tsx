import { useState, lazy, Suspense } from "react";
import { PrivacyModal } from "./components/PrivacyModal";
import { DemographicForm, DemographicData } from "./components/DemographicForm";
import { WebcamSetup } from "./components/WebcamSetup";
import { ExperimentDetailsModal } from "./components/ExperimentDetailsModal";
import { ExperimentView, SentimentDataPoint } from "./components/ExperimentView";
import { ThankYouModal } from "./components/ThankYouModal";
import { Button } from "./components/ui/button";
import { projectId, publicAnonKey } from "./utils/supabase/info";
import { logger, logError, logUserAction } from "./utils/logger";

// Lazy load admin components for code splitting
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(module => ({ default: module.AdminDashboard })));
const AdminLogin = lazy(() => import("./components/AdminLogin").then(module => ({ default: module.AdminLogin })));

type AppState =
  | "privacy"
  | "demographics"
  | "webcam-setup"
  | "experiment-details"
  | "experiment"
  | "thank-you"
  | "admin-login"
  | "admin"
  | "mode-selection";

export default function App() {
  const [appState, setAppState] = useState<AppState>("mode-selection");
  const [userId, setUserId] = useState<string>("");
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const handleModeSelection = (mode: "user" | "admin") => {
    if (mode === "admin") {
      setAppState("admin-login");
    } else {
      setAppState("privacy");
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    setAppState("admin");
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAppState("mode-selection");
  };

  const handlePrivacyAccept = () => {
    setPrivacyAccepted(true);
    setAppState("demographics");
  };

  const handlePrivacyReject = () => {
    alert("You must accept the privacy policy to participate in this study.");
  };

  const handleDemographicComplete = async (data: DemographicData) => {
    try {
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setUserId(newUserId);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8f45bf92/demographics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId: newUserId,
            ...data,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logError("Failed to store demographic data", new Error(errorText), "App", newUserId);
        alert("Failed to store demographic data. Please try again.");
        return;
      }

      logUserAction("demographic_data_submitted", newUserId);

      setAppState("webcam-setup");
    } catch (error) {
      logError("Error submitting demographics", error as Error, "App", newUserId);
      alert("An error occurred. Please try again.");
    }
  };

  const handleWebcamReady = (stream: MediaStream) => {
    setWebcamStream(stream);
    setAppState("experiment-details");
  };

  const handleExperimentReady = () => {
    setAppState("experiment");
  };

  const handleExperimentComplete = async (sentimentData: SentimentDataPoint[]) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8f45bf92/sentiment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId,
            sentimentData,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logError("Failed to store sentiment data", new Error(errorText), "App", userId);
      } else {
        logUserAction("sentiment_data_submitted", userId, { dataPointCount: sentimentData.length });
      }

      // Stop webcam stream
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }

      setAppState("thank-you");
    } catch (error) {
      logError("Error submitting sentiment data", error as Error, "App", userId);
    }
  };

  const renderContent = () => {
    switch (appState) {
      case "mode-selection":
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-md w-full space-y-8 text-center">
              <div>
                <h1>Facial Sentiment Analysis</h1>
                <p className="text-muted-foreground mt-2">
                  Select your mode to continue
                </p>
              </div>
              
              <div className="space-y-4">
                <Button
                  onClick={() => handleModeSelection("user")}
                  size="lg"
                  className="w-full"
                >
                  Participant Mode
                </Button>
                
                <Button
                  onClick={() => handleModeSelection("admin")}
                  size="lg"
                  variant="outline"
                  className="w-full"
                >
                  Admin Dashboard
                </Button>
              </div>
            </div>
          </div>
        );

      case "privacy":
        return (
          <PrivacyModal
            open={true}
            onAccept={handlePrivacyAccept}
            onReject={handlePrivacyReject}
          />
        );

      case "demographics":
        return (
          <DemographicForm
            open={true}
            onComplete={handleDemographicComplete}
          />
        );

      case "webcam-setup":
        return <WebcamSetup onReady={handleWebcamReady} />;

      case "experiment-details":
        return (
          <ExperimentDetailsModal
            open={true}
            onReady={handleExperimentReady}
          />
        );

      case "experiment":
        return webcamStream ? (
          <ExperimentView
            webcamStream={webcamStream}
            userId={userId}
            onComplete={handleExperimentComplete}
          />
        ) : null;

      case "thank-you":
        return <ThankYouModal open={true} />;

      case "admin-login":
        return (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading admin interface...</p>
            </div>
          </div>}>
            <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
          </Suspense>
        );

      case "admin":
        return isAdminAuthenticated ? (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading dashboard...</p>
            </div>
          </div>}>
            <AdminDashboard onLogout={handleAdminLogout} />
          </Suspense>
        ) : (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading admin interface...</p>
            </div>
          </div>}>
            <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
          </Suspense>
        );

      default:
        return null;
    }
  };

  return <div className="min-h-screen">{renderContent()}</div>;
}
