import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { CheckCircle } from "lucide-react";

interface ThankYouModalProps {
  open: boolean;
  onClose?: () => void;
}

export function ThankYouModal({ open, onClose }: ThankYouModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div className="text-center">
              <DialogTitle>Thank You for Participating!</DialogTitle>
              <DialogDescription className="mt-2">
                Your responses have been recorded successfully
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <p className="text-center text-sm text-muted-foreground">
            Your contribution to this research is greatly appreciated. Your data will help us 
            better understand emotional responses to video content.
          </p>
          
          <p className="text-center text-sm text-muted-foreground">
            If you have any questions or wish to exercise your data rights (access, deletion, etc.), 
            please contact the research team.
          </p>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose || (() => window.location.reload())} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
