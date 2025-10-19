import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

interface PrivacyModalProps {
  open: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function PrivacyModal({ open, onAccept, onReject }: PrivacyModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Facial Sentiment Analysis Study</DialogTitle>
          <DialogDescription>Privacy Policy & Consent</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <h3>Data Protection & GDPR Compliance</h3>
          
          <div className="space-y-3 text-sm">
            <p>
              This research study collects and processes personal data, including biometric information 
              (facial expressions and webcam recordings), in accordance with the General Data Protection 
              Regulation (GDPR) and applicable data protection laws.
            </p>
            
            <div>
              <h4>Data We Collect:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Demographic information (age, race/ethnicity, nationality, gender)</li>
                <li>Webcam video recordings of your facial expressions</li>
                <li>Facial sentiment analysis data derived from your expressions</li>
              </ul>
            </div>
            
            <div>
              <h4>Legal Basis for Processing:</h4>
              <p>
                Your explicit consent serves as the legal basis for processing your personal data. 
                You have the right to withdraw consent at any time.
              </p>
            </div>
            
            <div>
              <h4>Data Usage:</h4>
              <p>
                Your data will be used solely for research purposes to analyze emotional responses 
                to video content. Data may be aggregated and anonymized for research publications.
              </p>
            </div>
            
            <div>
              <h4>Your Rights:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
              </ul>
            </div>
            
            <div>
              <h4>Data Retention:</h4>
              <p>
                Your data will be retained for the duration of the research study and may be kept 
                for up to 5 years for validation purposes, unless you request earlier deletion.
              </p>
            </div>
            
            <div>
              <h4>Data Security:</h4>
              <p>
                We implement appropriate technical and organizational measures to ensure data security, 
                including encryption and access controls.
              </p>
            </div>
            
            <p className="pt-2">
              By clicking "Accept," you provide your explicit consent to participate in this study 
              and to the processing of your personal data as described above.
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onReject}>
            Reject
          </Button>
          <Button onClick={onAccept}>
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
