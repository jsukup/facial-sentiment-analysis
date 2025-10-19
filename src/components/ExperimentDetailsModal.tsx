import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Info } from "lucide-react";

interface ExperimentDetailsModalProps {
  open: boolean;
  onReady: () => void;
}

export function ExperimentDetailsModal({ open, onReady }: ExperimentDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Experiment Instructions</DialogTitle>
              <DialogDescription>Please read carefully before proceeding</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div>
              <h4>What You'll Do:</h4>
              <p className="text-sm text-muted-foreground">
                You will watch a short video while we capture your facial expressions using your webcam. 
                The video will last approximately 2-3 minutes.
              </p>
            </div>
            
            <div>
              <h4>During the Video:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1 text-sm text-muted-foreground">
                <li>Watch the video naturally and react as you normally would</li>
                <li>Try to keep your face visible in the webcam frame</li>
                <li>Avoid covering your face or turning away from the camera</li>
                <li>You may pause if needed, but try to watch continuously for best results</li>
              </ul>
            </div>
            
            <div>
              <h4>What We're Measuring:</h4>
              <p className="text-sm text-muted-foreground">
                Our facial sentiment analysis technology will detect and analyze your emotional responses 
                including happiness, sadness, surprise, anger, fear, disgust, and neutral expressions. 
                This helps us understand how people emotionally engage with video content.
              </p>
            </div>
            
            <div>
              <h4>Privacy Note:</h4>
              <p className="text-sm text-muted-foreground">
                Your webcam feed will be recorded and analyzed. The video and analysis data will be 
                stored securely and used only for research purposes as outlined in the privacy policy.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Ready to begin?</strong> Click the "Ready" button below to start the experiment. 
                The video will begin playing, and webcam recording will start automatically.
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onReady} size="lg" className="w-full">
            Ready
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
