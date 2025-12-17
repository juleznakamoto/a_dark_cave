import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RestartGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RestartGameDialog({
  isOpen,
  onClose,
  onConfirm,
}: RestartGameDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="leading-6">Start New Game</DialogTitle>
          <DialogDescription className="py-2 space-y-2">
            <div className="text-center space-y-2">
              <div className="bg-red-600/5 border border-red-600/50 rounded-lg p-3">
                <p className="text-md font-medium text-red-600">
                  All your current progress will be lost if you start a new
                  game.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            button_id="restart-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="flex-1 bg-primary"
            button_id="restart-confirm"
          >
            Start New Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
