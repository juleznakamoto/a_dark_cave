import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";

interface SignUpPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUpClick: () => void;
}

export default function SignUpPromptDialog({
  isOpen,
  onClose,
  onSignUpClick,
}: SignUpPromptDialogProps) {
  const handleSignUp = () => {
    onClose();
    onSignUpClick();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-md z-[70]">
        <DialogHeader>
          <DialogTitle>Save Your Progress</DialogTitle>
          <DialogDescription className="py-2 space-y-3">
            <p>
              Create a free account to save your game progress and sync across devices. Without an account, your progress may be lost.
            </p>
            <p className="font-medium text-foreground">
              Sign up now and receive <strong>250 Gold</strong> as a bonus!
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button onClick={handleSignUp} className="w-full font-medium">
            Sign Up
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
