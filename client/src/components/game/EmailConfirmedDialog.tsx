import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EmailConfirmedDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailConfirmedDialog({
  isOpen,
  onClose,
}: EmailConfirmedDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-md z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">Email Confirmed</DialogTitle>
          <DialogDescription className="py-2 space-y-2">
            <div className="text-center space-y-2">
              <div className="bg-green-600/10 border border-green-600/50 rounded-lg p-3">
                <p className="text-md font-medium text-green-600">
                  Your email has been verified successfully. Your account is now
                  active and your progress will be saved to the cloud.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full font-medium">
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
